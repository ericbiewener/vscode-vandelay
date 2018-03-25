// @flow
const vscode = require('vscode')
const {initializeSettings} = require('./settings')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  console.log('activating')
  initializeSettings()

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
    
  const disposable = vscode.commands.registerCommand('extension.sayHello', function () {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World!')
  })

  context.subscriptions.push(disposable)
}
exports.activate = activate


// this method is called when your extension is deactivated
// function deactivate() {
// }
// exports.deactivate = deactivate;
