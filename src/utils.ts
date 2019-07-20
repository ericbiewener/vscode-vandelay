import fs from 'fs'
import makeDir from 'make-dir'
import path from 'path'
import _ from 'lodash'
import {
  Diagnostic,
  languages,
  Position,
  TextEditorEdit,
  TextEdit,
  Range,
  TextDocument,
  TextEditor,
  window,
  WorkspaceFolder,
} from 'vscode'
import { VANDELAY_CONFIG_DIR } from './constants'
import { JS_EXTENSIONS } from './plugins/javascript/config'
import { Plugin, CachingData, ImportPosition } from './types'
import { PLUGINS } from './plugins'

const extensionToLang: { [ext: string]: string } = {}
for (const ext of JS_EXTENSIONS) extensionToLang[ext] = 'js'

export function writeCacheFile(plugin: Plugin, data: CachingData) {
  _.each(data.imp, d => (d.isExtraImport = true))
  return makeDir(plugin.cacheDirPath).then(() =>
    fs.writeFileSync(plugin.cacheFilepath, JSON.stringify(data))
  )
}

export function isFile(file: string) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    if (e.code !== 'ENOENT') throw e // File might exist, but something else went wrong (e.g. permissions error)
    return false
  }
}

export function getLangFromFilePath(filePath: string) {
  const ext = path.extname(filePath).slice(1)
  return extensionToLang[ext] || ext
}

export function getPluginForFile(filePath: string): Plugin | undefined {
  return PLUGINS[getLangFromFilePath(filePath)]
}

export function getPluginForActiveFile(silent = false) {
  if (!window.activeTextEditor) return
  const plugin = getPluginForFile(window.activeTextEditor.document.fileName)
  if (!plugin && !silent) window.showErrorMessage("Vandelay doesn't support the current language.")
  return plugin
}

export function getFilepathKey(plugin: Plugin, filepath: string) {
  return filepath.slice(plugin.projectRoot.length + 1)
}

export function basenameNoExt(filepath: string) {
  return path.basename(filepath, path.extname(filepath))
}

export function insertLine(
  newLine: string,
  importPosition: ImportPosition,
  shouldApplyEdit = true
) {
  const { match, isFirstImport } = importPosition
  const editor = window.activeTextEditor as TextEditor
  const { document } = editor

  // If this is the first import and the line after where we're inserting it has content, add an extra line break
  if (isFirstImport && document.lineAt(document.positionAt(match ? match.end + 1 : 0)).text) {
    newLine += '\n'
  }

  return shouldApplyEdit
    ? editor.edit(builder => createEdit(builder, document, newLine, importPosition))
    : createEdit(TextEdit, document, newLine, importPosition)
}

function createEdit(
  edit: TextEditorEdit | typeof TextEdit,
  document: TextDocument,
  newLine: string,
  importPosition: ImportPosition
) {
  const { match, indexModifier } = importPosition

  if (!match) {
    return edit.insert(new Position(0, 0), newLine + '\n')
  } else if (!indexModifier) {
    return edit.replace(
      new Range(document.positionAt(match.start), document.positionAt(match.end)),
      newLine
    )
  } else if (indexModifier === 1) {
    return edit.insert(document.positionAt(match.end), '\n' + newLine)
  } else {
    // -1
    return edit.insert(document.positionAt(match.start), newLine + '\n')
  }
}

export function getTabChar() {
  const { options } = window.activeTextEditor as TextEditor
  return options.insertSpaces ? _.repeat(' ', Number(options.tabSize) || 2) : '\t'
}

export function strUntil(str: string, endChar: string | RegExp) {
  const index = typeof endChar === 'string' ? str.indexOf(endChar) : str.search(endChar)
  return index < 0 ? str : str.slice(0, index)
}

export function removeExt(filepath: string) {
  const ext = path.extname(filepath)
  return ext ? filepath.slice(0, -ext.length) : filepath
}

export function getLastInitialComment(text: string, commentRegex: RegExp) {
  // Iterates over comment line matches. If one doesn't begin where the previous one left off, this means
  // a non comment line came between them.
  let expectedNextIndex = 0
  let match
  let lastMatch
  while ((match = commentRegex.exec(text))) {
    if (match.index !== expectedNextIndex) break
    expectedNextIndex = commentRegex.lastIndex + 1
    lastMatch = match
  }

  return lastMatch
    ? {
        start: lastMatch.index,
        end: lastMatch.index + lastMatch[0].length,
      }
    : null
}

export function getImportOrderPosition(plugin: Plugin, importPath: string) {
  if (!plugin.importGroups) return
  const index = _.flatten(plugin.importGroups).indexOf(importPath)
  return index > -1 ? index : undefined
}

export type DiagnosticFilter = (d: Diagnostic) => boolean

export function getDiagnosticsForActiveEditor(filter: DiagnosticFilter) {
  const editor = window.activeTextEditor as TextEditor
  return languages.getDiagnostics(editor.document.uri).filter(filter)
}

export interface DiagnosticsByFile {
  [path: string]: Diagnostic[]
}

export function mergeObjectsWithArrays(obj1: {}, obj2: {}) {
  return _.mergeWith(obj1, obj2, (obj, src) => {
    if (Array.isArray(obj)) return _.union(obj, src)
  })
}

export interface Renamed {
  [originalName: string]: string
}

export function addNamesAndRenames(imports: string[], names: string[], renamed: Renamed) {
  for (const imp of imports) {
    const parts = imp.split(' as ')
    const name = parts[0].trim()
    if (!name) continue
    names.push(name)
    if (parts[1]) renamed[name] = parts[1].trim()
  }
}

export function doesImportExist(imports: string[], newImport: string, renamed: Renamed) {
  const parts = newImport.split(' as ')
  const newImportName = parts[0].trim()
  const newImportRename = parts[1] ? parts[1].trim() : null

  if (!imports.includes(newImportName)) return false

  const existingImportRename = renamed[newImportName]
  if (newImportRename != existingImportRename) {
    window.showWarningMessage(`Already imported as \`${existingImportRename || newImportName}\`.`)
  }

  return true
}

export function preserveRenamedImports(imports: string[], renamed: Renamed) {
  if (_.isEmpty(renamed)) return [...imports]

  return imports.map(name => {
    const renaming = renamed[name]
    return renaming ? `${name} as ${renaming}` : name
  })
}

export function findVandelayConfigDir(workspaceFolders: WorkspaceFolder[]) {
  return workspaceFolders.find(f => f.name === VANDELAY_CONFIG_DIR)
}

export function showProjectExportsCachedMessage() {
  window.showInformationMessage('Project exports have been cached. 🐔')
}

// Lodash replacements for Typescript support
// TODO: figure out why the lodash fns aren't working

// _.last always makes TS think the value could be undefeind
export function last(arr: any[]) {
  return arr[arr.length - 1]
}

export function isObject(obj: any) {
  return obj && typeof obj === 'object'
}

export function getWordAtPosition(document: TextDocument, position: Position) {
  const range = document.getWordRangeAtPosition(position)
  return range ? document.getText(range) : null
}
