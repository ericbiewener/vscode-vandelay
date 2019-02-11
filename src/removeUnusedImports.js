const { window } = require("vscode");
const { getPluginForActiveFile } = require("./utils");

async function removeUnusedImports() {
  const plugin = getPluginForActiveFile();
  if (!plugin) return;

  const originalEditor = window.activeTextEditor;
  await plugin.removeUnusedImports(plugin);
  await window.showTextDocument(originalEditor.document.uri);
}

module.exports = {
  removeUnusedImports
};
