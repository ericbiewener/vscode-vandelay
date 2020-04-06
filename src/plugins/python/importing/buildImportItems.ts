import path from 'path'
import { removeFileExt } from 'utlz'
import { window, TextEditor } from 'vscode'
import { MergedExportDataPy, MergedExportDatumPy, PluginPy } from '../types'
import { RichQuickPickItem } from '../../../types'

export function buildImportItems(
  plugin: PluginPy,
  exportData: MergedExportDataPy,
  sortedKeys: string[],
): RichQuickPickItem[] {
  const { projectRoot, shouldIncludeImport } = plugin
  const editor = window.activeTextEditor as TextEditor
  const activeFilepath = editor.document.fileName
  const items = []

  for (const importPath of sortedKeys) {
    const data = exportData[importPath]
    const absImportPath = data.isExtraImport ? importPath : path.join(projectRoot, importPath)
    if (absImportPath === activeFilepath) continue
    if (shouldIncludeImport && !shouldIncludeImport(absImportPath, activeFilepath)) {
      continue
    }

    if (data.importEntirePackage) {
      items.push({
        label: processImportName(plugin, importPath, dotPath, absImportPath, activeFilepath),
        isExtraImport: data.isExtraImport,
      })
    }

    if (!data.exports) continue

    // Don't sort data.exports because they were already sorted when caching. See python `cacheFile`
    for (const exportName of data.exports) {
      const importName = processImportName(plugin, exportName, dotPath, absImportPath, activeFilepath)
      items.push({
        label: importName,
        description: getImportDotPath({ plugin, data, importPath, absImportPath, activeFilepath, importName }),
        isExtraImport: data.isExtraImport,
      })
    }
  }

  return items
}

type GetImportDotPath = {
  plugin: PluginPy,
  data: MergedExportDatumPy,
  importPath: string,
  absImportPath: string,
  activeFilepath: string,
  importName: string,
}

function getImportDotPath({ data, importPath }: GetImportDotPath) {
  if (data.isExtraImport) return importPath
  
  let dotPath = removeFileExt(importPath).replace(/\//g, '.')
  if (plugin.processImportPath) {
    dotPath =
      plugin.processImportPath(dotPath, absImportPath, activeFilepath, plugin.projectRoot, importName) ||
      dotPath
  }
}

function processImportName(
  plugin: PluginPy,
  importName: string,
  importPath: string,
  absImportPath: string,
  activeFilepath: string,
) {
  if (!plugin.processImportName) return importName
  return (
    plugin.processImportName(
      importName,
      importPath,
      absImportPath,
      activeFilepath,
      plugin.projectRoot,
    ) || importName
  )
}
