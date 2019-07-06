import path from 'path'
import { commands, ExtensionContext, window, workspace } from 'vscode'
import _ from 'lodash'
import { cacheProjectLanguage } from './cacher'
import { catchError } from './initialization/catchError'
import { finalizeExtensionActivation } from './initialization/finalizeExtensionActivation'
import { initProject } from './initialization/initProject'
import { initializePlugin, initializePluginForLang, PLUGINS } from './plugins'
import { pluginConfigs } from './registerPluginConfig'
import { alertNewVersion } from './newVersionAlerting'
import { Language } from './types'
import { findVandelayConfigDir, showProjectExportsCachedMessage } from './utils'

export const activate = async function activate(context: ExtensionContext) {
  alertNewVersion(context)

  // We need these commands active regardless of whether any plugins exist
  context.subscriptions.push(
    commands.registerCommand('vandelay.initProject', catchError(() => initProject(context)))
  )

  // Watch for config changes.
  workspace.onDidSaveTextDocument(async doc => {
    const file = path.basename(doc.fileName, '.js')
    if (!file.startsWith('vandelay-')) return

    const lang = file.split('-')[1] as Language
    const didCache = await initializePluginForLang(context, lang)
    finalizeExtensionActivation(context)
    if (didCache) {
      showProjectExportsCachedMessage()
      return
    }
    // If they changed something like `includePaths` then we'd need to re-cache. So just do it
    // anyway. This will cache silently (no success message)
    const plugin = PLUGINS[lang]
    if (plugin) cacheProjectLanguage(plugin)
    // No need to alert about having cached here because the user has already had their project
    // cached before, so we can just update silently.
  })

  workspace.onDidChangeWorkspaceFolders(async ({ added }) => {
    const configWorkspaceFolder = findVandelayConfigDir(added)
    if (!configWorkspaceFolder) return
    const didCache = await initializePlugins(context)
    finalizeExtensionActivation(context)
    if (didCache) showProjectExportsCachedMessage()
  })

  await initializePlugins(context)
  if (!_.isEmpty(PLUGINS)) finalizeExtensionActivation(context)

  return {
    registerPlugin: async ({ language }: { language: string }) => {
      window.showErrorMessage(
        `Please uninstall extension Vandelay ${language.toUpperCase()}. Vandelay no longer requires langauge extensions to be installed separately.`
      )
      await commands.executeCommand('workbench.extensions.action.showEnabledExtensions')
    },
    _test: {
      plugins: PLUGINS,
    },
    // Prevent Vandelay JS/PY from throwing error. TODO: Remove some time in the future
    commands: {},
  }
}

export function initializePlugins(context: ExtensionContext) {
  const configs = Object.values(pluginConfigs)
  return Promise.all(configs.map(c => initializePlugin(context, c)))
}
