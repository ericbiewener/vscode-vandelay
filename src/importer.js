const {window, workspace} = require('vscode')
const {PLUGINS} = require('./plugins')
const {getLangFromFilePath, parseCacheFile} = require('./utils')

async function selectImport(word) {
  if (!window.activeTextEditor) return
  
  const plugin = PLUGINS[getLangFromFilePath(window.activeTextEditor.document.fileName)]
  if (!plugin) return
  
  const exportData = parseCacheFile(plugin)
  if (!exportData) return
  
  let items = plugin.buildImportItems(plugin, exportData)
  if (word) items = items.filter(item => item.label === word)

  const selection = !word || items.length > 1 || !workspace.getConfiguration('vandelay').autoImportSingleResult
    ? await window.showQuickPick(items, {matchOnDescription: true})
    : items[0]
  
  if (!selection) return
  plugin.insertImport(plugin, selection)
}

async function selectImportForActiveWord() {
  const editor = window.activeTextEditor
  if (!editor) return

  const range = editor.document.getWordRangeAtPosition(editor.selection.active)
  const activeWord = range ? editor.document.getText(range) : null
  selectImport(activeWord)
}

module.exports = {
  selectImport,
  selectImportForActiveWord,
}
