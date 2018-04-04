const {commands} = require('vscode')
const {initializeSettings} = require('./settings')
const {cacheProject} = require('./cacher')
const {selectImport} = require('./importer')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  initializeSettings()

  context.subscriptions.push(
    commands.registerCommand('vandelay.cacheProject', cacheProject),
    // TODO: this command should only be available for included languages... possible to do that dynamically based
    // on SETTINGS?
    commands.registerCommand('vandelay.selectImport', selectImport),
  )
}
exports.activate = activate


// this method is called when your extension is deactivated
// function deactivate() {
// }
// exports.deactivate = deactivate;
