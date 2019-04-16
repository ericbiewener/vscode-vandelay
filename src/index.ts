import {
  commands,
  ExtensionContext,
  languages,
  window,
  workspace,
  ConfigurationTarget,
} from 'vscode'
import _ from 'lodash'
import { initializePlugin, PLUGINS } from './plugins'
import { cacheProject, watchForChanges } from './cacher'
import {
  importUndefinedVariables,
  onDidChangeDiagnostics,
  selectImport,
  selectImportForActiveWord,
} from './importer'
import { config as jsConfig } from './plugins/javascript/config'
import { config as pyConfig } from './plugins/python/config'
import { removeUnusedImports } from './removeUnusedImports'
import { showNewVersionAlert } from './showNewVersionMessage'

/*
 * VS Code has an error swallowing problem, so we catch and manually log.
 */
function catchError(fn: (...args: any[]) => any) {
  return async function(...args: any[]) {
    try {
      const result = await fn(...args)
      return result
    } catch (e) {
      console.error(e)
      window.showErrorMessage(
        'Vandelay extension error! Please run the "Toggle Developer Tools" VS Code command and post the stacktrace at https://github.com/ericbiewener/vscode-vandelay.'
      )
      throw e
    }
  }
}

export const activate = async function activate(context: ExtensionContext) {
  // Migrate settings to new names
  const settings = workspace.getConfiguration('vandelay')
  const scope = settings.inspect('autoImportSingleResult')
  if (scope) {
    settings.update(
      'autoSelectSingleImportResult',
      scope.globalValue,
      ConfigurationTarget.Global
    )
    settings.update(
      'autoSelectSingleImportResult',
      scope.workspaceValue,
      ConfigurationTarget.Workspace
    )
  }

  showNewVersionAlert(context)

  const pluginConfigs = [jsConfig, pyConfig]

  await Promise.all(pluginConfigs.map(c => initializePlugin(context, c)))

  if (_.isEmpty(PLUGINS)) return

  context.subscriptions.push(
    commands.registerCommand('vandelay.cacheProject', catchError(cacheProject)),
    commands.registerCommand(
      'vandelay.selectImport',
      catchError(() => selectImport())
    ),
    commands.registerCommand(
      'vandelay.selectImportForActiveWord',
      catchError(() => selectImportForActiveWord())
    ),
    commands.registerCommand(
      'vandelay.importUndefinedVariables',
      catchError(() => importUndefinedVariables())
    ),
    commands.registerCommand(
      'vandelay.removeUnusedImports',
      catchError(removeUnusedImports)
    ),
    commands.registerCommand(
      'vandelay.fixImports',
      catchError(async () => {
        await removeUnusedImports()
        await importUndefinedVariables()
      })
    ),

    workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration('vandelay.configLocation') ||
        e.affectsConfiguration('vandelay.projectRoot')
      ) {
        pluginConfigs.forEach(config => initializePlugin(context, config))
      }
    }),

    watchForChanges()
  )

  if (settings.autoImport) {
    context.subscriptions.push(
      languages.onDidChangeDiagnostics(onDidChangeDiagnostics)
    )
  }

  return {
    registerPlugin: async ({ language }: { language: string }) => {
      window.showErrorMessage(
        `Please uninstall extension Vandelay ${language.toUpperCase()}. Vandelay no longer requires langauge extensions to be installed separately.`
      )
      await commands.executeCommand(
        'workbench.extensions.action.showEnabledExtensions'
      )
    },
    _test: {
      plugins: PLUGINS,
    },
    // Prevent Vandelay JS/PY from throwing error. #TODO: Remove some time in the future
    commands: {},
  }
}
