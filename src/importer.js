const _ = require('lodash')
const { window, workspace } = require('vscode')
const { getDiagnostics } = require('./sharedUtils')
const { getImportItems, getPluginForActiveFile } = require('./utils')
const { cacheFileManager } = require('./cacheFileManager')

async function selectImport(word, buildImportItems) {
  const plugin = getPluginForActiveFile()
  if (!plugin) return

  return await cacheFileManager(plugin, async exportData => {
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
    return plugin.insertImport(plugin, selection)
  })
}

async function selectImportForActiveWord(buildImportItems) {
  const editor = window.activeTextEditor
  if (!editor) return

  const range = editor.document.getWordRangeAtPosition(editor.selection.active)
  const activeWord = range ? editor.document.getText(range) : null
  selectImport(activeWord, buildImportItems)
}

async function importUndefinedVariables() {
  const filter = _.get(getPluginForActiveFile(), 'shouldIncludeDisgnostic')
  if (!filter) return []

  const diagnostics = getDiagnostics(filter, true)
  if (!diagnostics.length) return

  const { document } = window.activeTextEditor
  // Must collect all words before inserting any because insertions will cause the diagnostic ranges
  // to no longer be correct, thus not allowing us to get subsequent words
  const words = diagnostics.reduce((acc, d) => {
    // Flake8 is returning a collapsed range, so expand it to the entire word
    const range = _.isEqual(d.range.start, d.range.end)
      ? document.getWordRangeAtPosition(d.range.start)
      : d.range
    acc.push(document.getText(range))
    return acc
  }, [])

  for (const word of _.uniq(words)) await selectImport(word)
}

module.exports = {
  selectImport,
  selectImportForActiveWord,
  importUndefinedVariables,
}
