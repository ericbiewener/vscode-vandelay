import { Diagnostic, ExtensionContext, workspace } from 'vscode'
import { alertWithActions } from '../../alertWithActions'
import { isActivationComplete } from '../../initialization/finalizeExtensionActivation'
import { cacheNodeModules, findPackageJsonFiles } from './cacheNodeModules/cacheNodeModules'
import { cacheFile, processCachedData } from './cacher'
import { buildImportItems } from './importing/buildImportItems'
import { insertImport } from './importing/importer'
import { removeUnusedImports } from './removeUnusedImports'
import { PluginConfigJs, PluginJs, ExportDataJs } from './types'

export const JS_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'mdx']

type DiagnosticCode = string | number | undefined

const ESLINT_CODES: DiagnosticCode[] = ['no-undef', 'react/jsx-no-undef']
const TYPESCRIPT_CODES: DiagnosticCode[] = [2304, 2552, 18004]

function shouldIncludeDisgnostic({ code, source, message }: Diagnostic) {
  return (
    ESLINT_CODES.includes(code) ||
    (source === 'flow' && message.startsWith('Cannot resolve name')) ||
    (source === 'ts' && TYPESCRIPT_CODES.includes(code))
  )
}

function watchForPackageJsonChanges(context: ExtensionContext, plugin: PluginJs) {
  const packageJsonFiles = findPackageJsonFiles(plugin)
  const pattern =
    packageJsonFiles.length > 1 ? `{${packageJsonFiles.join(',')}}` : packageJsonFiles[0]
  const watcher = workspace.createFileSystemWatcher(pattern)
  context.subscriptions.push(watcher)
  watcher.onDidChange(() => cacheNodeModules(plugin))
}

function turnOfDefaultAutoImports(context: ExtensionContext, plugin: PluginJs) {
  const languages = ['javascript', 'typescript']
  const configs = languages.map(l => workspace.getConfiguration(l, null))
  const configKey = 'suggest.autoImports'
  if (!configs.some(c => c.get(configKey))) return

  const fullConfigKeys = languages.map(l => `${l}.${configKey}`)

  alertWithActions({
    msg: `Vandelay now supports auto import suggestions as you type. We recommend you turn off VS Code's version of this so that you don't get duplicate suggestions.\n\nFor reference, the VS Code settings are named "${fullConfigKeys.join(
      '" and "'
    )}".`,
    modal: true,
    actions: [
      {
        title: 'Turn it off!',
        action: () => {
          for (const c of configs) c.update('suggest.autoImports', false, true)
        },
      },
    ],
  })
}

async function finalizeInit(context: ExtensionContext, plugin: PluginJs) {
  watchForPackageJsonChanges(context, plugin)
  turnOfDefaultAutoImports(context, plugin)
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
  finalizeInit,
  finalizeCacheLanguage,
  mergeExportData,
}
