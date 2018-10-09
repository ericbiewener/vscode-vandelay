const { window, workspace } = require('vscode')
const { PLUGINS } = require('./plugins')
const { getImportItems, getLangFromFilePath } = require('./utils')
const { cacheFileManager } = require('./cacheFileManager')

async function selectImport(word, buildImportItems) {
  if (!window.activeTextEditor) return

  const plugin =
    PLUGINS[getLangFromFilePath(window.activeTextEditor.document.fileName)]
  if (!plugin) { 
    window.showErrorMessage('No Vandelay plugin found for current file.')
    return 
  }

  await cacheFileManager(plugin, async exportData => {
    let items = getImportItems(plugin, exportData, buildImportItems)
    if (!items) return
    if (word) items = items.filter(item => item.label === word)

    const selection =
      !word ||
      items.length > 1 ||
      !workspace.getConfiguration('vandelay').autoImportSingleResult
        ? await window.showQuickPick(items, { matchOnDescription: true })
        : items[0]

    if (!selection) return
    plugin.insertImport(plugin, selection)
  })
}

async function selectImportForActiveWord(buildImportItems) {
  const editor = window.activeTextEditor
  if (!editor) return

  const range = editor.document.getWordRangeAtPosition(editor.selection.active)
  const activeWord = range ? editor.document.getText(range) : null
  selectImport(activeWord, buildImportItems)
}

module.exports = {
  selectImport,
  selectImportForActiveWord,
}
