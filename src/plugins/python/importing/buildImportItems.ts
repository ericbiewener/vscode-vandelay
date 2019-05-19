import path from 'path'
import { window, TextEditor } from 'vscode'
import { PluginPy, MergedExportDataPy } from '../types'
import { removeExt } from '../../../utils'
import { RichQuickPickItem } from '../../../types'

export function buildImportItems(
  plugin: PluginPy,
  exportData: MergedExportDataPy,
  sortedKeys: string[]
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

    let dotPath
    if (data.isExtraImport) {
      dotPath = importPath
    } else {
      dotPath = removeExt(importPath).replace(/\//g, '.')
      if (plugin.processImportPath) {
        dotPath =
          plugin.processImportPath(dotPath, absImportPath, activeFilepath, plugin.projectRoot) ||
          dotPath
      }
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
      items.push({
        label: processImportName(plugin, exportName, dotPath, absImportPath, activeFilepath),
        description: dotPath,
        isExtraImport: data.isExtraImport,
      })
    }
  }

  return items
}

function processImportName(
  plugin: PluginPy,
  importName: string,
  importPath: string,
  absImportPath: string,
  activeFilepath: string
) {
  if (!plugin.processImportName) return importName
  return (
    plugin.processImportName(
      importName,
      importPath,
      absImportPath,
      activeFilepath,
      plugin.projectRoot
    ) || importName
  )
}
