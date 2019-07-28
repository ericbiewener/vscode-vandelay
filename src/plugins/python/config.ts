import { cacheFile } from './cacher'
import { insertImport } from './importing/importer'
import { buildImportItems } from './importing/buildImportItems'
import { removeUnusedImports } from './removeUnusedImports'
import { ExportDataPy, PluginConfigPy } from './types'
import { Diagnostic } from 'vscode'

function shouldIncludeDisgnostic({ code }: Diagnostic) {
  return code === 'F821'
}

function mergeExportData(exportData: ExportDataPy) {
  return {
    ...exportData.imp,
    ...exportData.exp,
  }
}

export const pyConfig: PluginConfigPy = {
  language: 'py',
  cacheFile,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  shouldIncludeDisgnostic,
  extensions: ['py'],
  mergeExportData,
}
