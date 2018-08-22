const { window, commands, workspace } = require('vscode')
const { initializePlugin } = require('./plugins')
const { cacheProject, watchForChanges } = require('./cacher')
const { selectImport, selectImportForActiveWord } = require('./importer')
const { getImportItems } = require('./utils')

/*
 * VS Code has an error swallowing problem, so we catch and manually log.
 */
function catchError(fn) {
  return async function(...args) {
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

function activate(context) {
  console.log('Vandelay Core activating')
  context.subscriptions.push(
    commands.registerCommand('vandelay.cacheProject', catchError(cacheProject)),
    commands.registerCommand(
      'vandelay.selectImport',
      catchError(() => selectImport())
    ),
    commands.registerCommand(
      'vandelay.selectImportForActiveWord',
      catchError(() => selectImportForActiveWord())
    )
  )

  const pluginConfigs = []

  workspace.onDidChangeConfiguration(e => {
    if (
      e.affectsConfiguration('vandelay.configLocation') ||
      e.affectsConfiguration('vandelay.projectRoot')
    ) {
      pluginConfigs.forEach(config => initializePlugin(context, config))
    }
  })

  watchForChanges()

  return {
    registerPlugin(pluginConfig) {
      console.log(
        `Vandelay plugin being registered for language: ${
          pluginConfig.language
        }`
      )
      initializePlugin(context, pluginConfig)
      pluginConfigs.push(pluginConfig)
    },
    commands: {
      selectImport: catchError(selectImport),
      selectImportForActiveWord: catchError(selectImportForActiveWord),
    },
    _test: {
      pluginConfigs,
      getImportItems,
    },
  }
}
exports.activate = activate

// TODO: what do i need to clean up on deactivate?
// function deactivate() {
// }
// exports.deactivate = deactivate;
