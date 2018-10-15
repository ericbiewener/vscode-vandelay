const { window } = require('vscode')
const { getPluginForActiveFile } = require('./utils')

async function removeUnusedImports() {
  const plugin = getPluginForActiveFile()
  if (!plugin) return

  if (!plugin.removeUnusedImports) {
    window.showErrorMessage(
      "The Vandelay plugin for this file type hasn't implemented this feature."
    )
    return
  }

  const originalEditor = window.activeTextEditor
  await plugin.removeUnusedImports(plugin)
  await window.showTextDocument(originalEditor.document.uri)
}

module.exports = {
  removeUnusedImports,
}
