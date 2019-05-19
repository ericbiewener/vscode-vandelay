import _ from 'lodash'
import { window, TextEditor } from 'vscode'
import path from 'path'
import {
  doesImportExist,
  insertLine,
  removeExt,
  Renamed,
  preserveRenamedImports,
} from '../../../utils'
import { parseImports, ParsedImportJs } from '../regex'
import { FileExportsJs, PluginJs, RichQuickPickItemJs, ExportType } from '../types'
import { getImportPosition, ImportPositionJs } from './getImportPosition'
import { getNewLine } from './getNewLine'

export async function insertImport(plugin: PluginJs, selection: RichQuickPickItemJs) {
  const {
    label: exportName,
    description: importPath,
    absImportPath,
    exportType,
    isExtraImport,
  } = selection
  const editor = window.activeTextEditor

  const finalImportPath = getFinalImportPath(plugin, importPath, absImportPath, isExtraImport)
  const fileText = (editor as TextEditor).document.getText()
  const imports = parseImports(plugin, fileText)

  const importPosition = getImportPosition(
    plugin,
    exportType,
    finalImportPath,
    isExtraImport,
    imports,
    fileText
  )
  const lineImports = getNewLineImports(importPosition, exportName, exportType)
  if (!lineImports) return
  const newLine = getNewLine(plugin, finalImportPath, lineImports)

  return insertLine(newLine, importPosition)
}

function getFinalImportPath(
  plugin: PluginJs,
  importPath: string,
  absImportPath: string,
  isExtraImport: boolean | undefined
) {
  if (isExtraImport) return importPath

  const activeFilepath = (window.activeTextEditor as TextEditor).document.fileName
  importPath = getRelativeImportPath(activeFilepath, absImportPath)

  if (plugin.processImportPath) {
    const processedPath = plugin.processImportPath(
      importPath,
      absImportPath,
      activeFilepath,
      plugin.projectRoot
    )
    return removeExt(processedPath || importPath)
  }

  return path.basename(importPath) === 'index.js' ? path.dirname(importPath) : removeExt(importPath)
}

function getNewLineImports(
  importPosition: ImportPositionJs,
  exportName: string,
  exportType: ExportType
) {
  const { match, indexModifier, isFirstImport } = importPosition

  let imports: FileExportsJs
  let renamed: Renamed

  if (indexModifier || isFirstImport) {
    imports = { named: [], types: [] }
    renamed = {}
  } else {
    const obj = match as ParsedImportJs
    renamed = obj.renamed
    imports = {
      named: obj.named,
      types: obj.types,
      default: obj.default,
    }
  }

  if (exportType === ExportType.default) {
    if (imports.default) return
    imports.default = exportName
  } else {
    const arr = imports[exportType === ExportType.named ? 'named' : 'types']
    if (doesImportExist(arr, exportName, renamed)) return
    arr.push(exportName)
  }

  imports.named = preserveRenamedImports(imports.named, renamed)
  imports.types = preserveRenamedImports(imports.types, renamed)
  return imports
}

function getRelativeImportPath(file: string, absImportPath: string) {
  const relativePath = path.relative(path.dirname(file), absImportPath)
  return relativePath[0] === '.' ? relativePath : '.' + path.sep + relativePath
}
