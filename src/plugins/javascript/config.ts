import { Diagnostic, ExtensionContext, workspace } from 'vscode'
import { cacheProjectLanguage } from '../../cacher'
import { isActivationComplete } from '../../initialization/finalizeExtensionActivation'
import { cacheNodeModules, findPackageJsonFiles } from './cacheNodeModules'
import { removeUnusedImports } from './removeUnusedImports'
import { cacheFile, processCachedData } from './cacher'
import { buildImportItems } from './importing/buildImportItems'
import { insertImport } from './importing/importer'
import { PluginConfigJs, PluginJs, ExportDataJs } from './types'

export const JS_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'mdx']

type DiagnosticCode = string | number | undefined

const ESLINT_CODES: DiagnosticCode[] = ['no-undef', 'react/jsx-no-undef']
const TYPESCRIPT_CODES: DiagnosticCode[] = [2304, 2552]

function shouldIncludeDisgnostic({ code, source, message }: Diagnostic) {
  return (
    ESLINT_CODES.includes(code) ||
    (source === 'flow' && message.startsWith('Cannot resolve name')) ||
    (source === 'ts' && TYPESCRIPT_CODES.includes(code))
  )
}

async function watchForPackageJsonChanges(context: ExtensionContext, plugin: PluginJs) {
  const packageJsonFiles = findPackageJsonFiles(plugin)

  const pattern =
    packageJsonFiles.length > 1 ? `{${packageJsonFiles.join(',')}}` : packageJsonFiles[0]

  const watcher = workspace.createFileSystemWatcher(pattern)
  context.subscriptions.push(watcher)

  watcher.onDidChange(async () => console.log("PACKAGEJSON CHANGED") || cacheNodeModules(plugin))
}

function mergeExportData(exportData: ExportDataJs) {
  return {
    ...exportData.nodeModules,
    ...exportData.imp,
    ...exportData.exp,
  }
}

function finalizeCacheLanguage(plugin: PluginJs) {
  const caching = cacheNodeModules(plugin)
  // Don't return if we are still activating because that will delay the final steps of activation.
  // Return once activated, however, so that "Project exports cached" notification waits until node
  // modules are done.
  if (isActivationComplete()) return caching
}

export const jsConfig: PluginConfigJs = {
  language: 'js',
  cacheFile,
  processCachedData,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  shouldIncludeDisgnostic,
  useSingleQuotes: true,
  padCurlyBraces: true,
  useSemicolons: true,
  trailingComma: true,
  multilineImportStyle: 'multiple',
  excludePatterns: [/.*\/node_modules(\/.*)?/],
  extensions: JS_EXTENSIONS,
  finalizeInit: watchForPackageJsonChanges,
  finalizeCacheLanguage,
  mergeExportData,
}
