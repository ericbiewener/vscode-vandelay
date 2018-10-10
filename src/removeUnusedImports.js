const { window } = require('vscode')
const { getPluginForActiveFile } = require('./utils')

function removeUnusedImports() {
  const plugin = getPluginForActiveFile()
  if (!plugin) return

  if (!plugin.removeUnusedImports) {
    window.showErrorMessage(
      "The Vandelay plugin for this file type hasn't implemented this feature."
    )
    return
  }

  plugin.removeUnusedImports(plugin)
}

module.exports = {
  removeUnusedImports,
}
