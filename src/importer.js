const { window, workspace } = require('vscode')
const { PLUGINS } = require('./plugins')
const { getLangFromFilePath } = require('./utils')
const { cacheFileManager } = require('./cacheFileManager')

async function selectImport(word, buildImportItems) {
  if (!window.activeTextEditor) return

  const plugin =
    PLUGINS[getLangFromFilePath(window.activeTextEditor.document.fileName)]
  if (!plugin) return

  await cacheFileManager(plugin, async exportData => {
    Object.assign(exportData, exportData._extraImports, plugin.extraImports)
    delete exportData._extraImports

    if (!exportData) return

    let items = (buildImportItems || plugin.buildImportItems)(
      plugin,
      exportData
    )
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
