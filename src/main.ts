import path from 'path'
import { commands, ExtensionContext, window, workspace } from 'vscode'
import _ from 'lodash'
import {globals} from './globals'
import { catchError } from './initialization/catchError'
import { finalizeExtensionActivation } from './initialization/finalizeExtensionActivation'
import { initProject } from './initialization/initProject'
import { initializePlugin, initializePluginForLang, PLUGINS } from './plugins'
import { pluginConfigs } from './registerPluginConfig'
import { alertNewVersion } from './newVersionAlerting'
import { Language } from './types'
import { findVandelayConfigDir, showProjectExportsCachedMessage } from './utils'

export const activate = async function activate(ctx: ExtensionContext) {
  globals.ctx = ctx
  alertNewVersion()

  // We need these commands active regardless of whether any plugins exist
  ctx.subscriptions.push(
    commands.registerCommand('vandelay.initProject', catchError(() => initProject()))
  )

  // Watch for config changes.
  workspace.onDidSaveTextDocument(async doc => {
    const file = path.basename(doc.fileName, '.js')
    if (!file.startsWith('vandelay-')) return

    const lang = file.split('-')[1] as Language
    const isInitialCache = await initializePluginForLang(lang)
    finalizeExtensionActivation()
    if (isInitialCache) showProjectExportsCachedMessage()
  })

  workspace.onDidChangeWorkspaceFolders(async ({ added }) => {
    const configWorkspaceFolder = findVandelayConfigDir(added)
    if (!configWorkspaceFolder) return
    await initializePlugins()
    finalizeExtensionActivation()
    showProjectExportsCachedMessage()
  })

  await initializePlugins()
  if (!_.isEmpty(PLUGINS)) finalizeExtensionActivation()

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

export function initializePlugins() {
  const configs = Object.values(pluginConfigs)
  return Promise.all(configs.map(initializePlugin))
}
