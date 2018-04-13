const path = require('path')
const {window, workspace} = require('vscode')
const {readCacheFileJs, insertImportJs} = require('./importer-js')
const {readCacheFilePy, insertImportPy} = require('./importer-py')

const readCacheFile = {
  js: readCacheFileJs,
  py: readCacheFilePy,
}

const insertImport = {
  js: insertImportJs,
  py: insertImportPy,
}

async function selectImport(word) {
  if (!window.activeTextEditor) return
  
  let lang = path.extname(window.activeTextEditor.document.fileName).slice(1)
  if (lang === 'jsx') lang = 'js'
  const readFn = readCacheFile[lang]
  if (!readFn) return
  
  let items = readFn()
  if (word) items = items.filter(item => item.label === word)

  const selection = !word || items.length > 1 || !workspace.getConfiguration('vandelay').autoImportSingleResult
    ? await window.showQuickPick(items, {matchOnDescription: true})
    : items[0]
  
  if (!selection) return
  insertImport[lang](selection)
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
