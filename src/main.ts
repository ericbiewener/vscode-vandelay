import path from 'path'
import { commands, ExtensionContext, window, workspace } from 'vscode'
import _ from 'lodash'
import { catchError } from './initialization/catchError'
import { finalizeExtensionActivation } from './initialization/finalizeExtensionActivation'
import { initConfigFile } from './initialization/initConfigFile'
import { initializePlugin, initializePluginForLang, PLUGINS } from './plugins'
import { pluginConfigs } from './registerPluginConfig'
import { alertNewVersion } from './newVersionAlerting'

export const activate = async function activate(context: ExtensionContext) {
  alertNewVersion(context)

  // We need these commands active regardless of whether any plugins exist
  context.subscriptions.push(
    commands.registerCommand('vandelay.initConfigFile', catchError(() => initConfigFile(context)))
  )

  // Watch for config changes.
  workspace.onDidSaveTextDocument(async doc => {
    const file = path.basename(doc.fileName, '.js')
    if (!file.startsWith('vandelay-')) return
    initializePluginForLang(context, file.split('-')[1])
    finalizeExtensionActivation(context)
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
