const {commands} = require('vscode')
const {initializeSettings} = require('./settings')
const {cacheProject, watchForChanges} = require('./cacher')
const {selectImport} = require('./importer')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  initializeSettings(context)
  watchForChanges()

  context.subscriptions.push(
    commands.registerCommand('vandelay.cacheProject', cacheProject),
    // TODO: this command should only be available for included languages... possible to do that dynamically based
    // on SETTINGS?
    commands.registerCommand('vandelay.selectImport', selectImport),
  )
}
exports.activate = activate

// TODO: what do i need to clean up on deactivate?
// function deactivate() {
// }
// exports.deactivate = deactivate;
