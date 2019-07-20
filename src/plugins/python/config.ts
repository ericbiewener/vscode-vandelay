import { createCompletionProvider } from '../../createCompletionItemProvider'
import { cacheFile } from './cacher'
import { insertImport } from './importing/importer'
import { buildImportItems } from './importing/buildImportItems'
import { removeUnusedImports } from './removeUnusedImports'
import { PluginConfigPy } from './types'
import { Diagnostic, languages } from 'vscode'

function shouldIncludeDisgnostic({ code }: Diagnostic) {
  return code === 'F821'
}

const CompletionProvider = createCompletionProvider(insertImport)

function registerCompletionItemProvider() {
  return [
    languages.registerCompletionItemProvider(
      { language: 'python', scheme: 'file' },
      CompletionProvider
    ),
  ]
}

export const pyConfig: PluginConfigPy = {
  language: 'py',
  cacheFile,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  shouldIncludeDisgnostic,
  registerCompletionItemProvider,
}
