const {commands, workspace} = require('vscode')
const {SETTINGS, initializeSettings} = require('./settings')
const {cacheProject, watchForChanges} = require('./cacher')
const {selectImport, selectImportForActiveWord} = require('./importer')
const {isFile} = require('./utils')

function activate(context) {
  initializeSettings(context)
  
  // Cache project on launch if not already caches
  for (const lang in SETTINGS) {
    if (isFile(SETTINGS[lang].cacheFile)) continue
    cacheProject(true)
    break
  }
  
  workspace.onDidChangeConfiguration(e => {
    if (
      e.affectsConfiguration('vandelay.configLocation') ||
      e.affectsConfiguration('vandelay.projectRoot')
    ) initializeSettings(context)
  })
  
  watchForChanges()

  context.subscriptions.push(
    commands.registerCommand('vandelay.cacheProject', cacheProject),
    // TODO: this command should only be available for included languages... possible to do that dynamically based
    // on SETTINGS?
    commands.registerCommand('vandelay.selectImport', selectImport),
    commands.registerCommand('vandelay.selectImportForActiveWord', selectImportForActiveWord),
  )
}
exports.activate = activate

// TODO: what do i need to clean up on deactivate?
// function deactivate() {
// }
// exports.deactivate = deactivate;
