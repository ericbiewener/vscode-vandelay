const {commands, workspace} = require('vscode')
const {initializePlugin} = require('./plugins')
const {cacheProject, watchForChanges} = require('./cacher')
const {selectImport, selectImportForActiveWord} = require('./importer')

function activate(context) {

  context.subscriptions.push(
    commands.registerCommand('vandelay.cacheProject', cacheProject),
    commands.registerCommand('vandelay.selectImport', () => selectImport()),
    commands.registerCommand('vandelay.selectImportForActiveWord', () => selectImportForActiveWord()),
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
      initializePlugin(context, pluginConfig)
      pluginConfigs.push(pluginConfig)
    },
    commands: {
      selectImport,
      selectImportForActiveWord,
    },
  }
}
exports.activate = activate

// TODO: what do i need to clean up on deactivate?
// function deactivate() {
// }
// exports.deactivate = deactivate;
