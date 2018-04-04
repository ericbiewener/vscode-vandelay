const path = require('path')
const {window} = require('vscode')
const {readCacheFileJs, insertImportJs} = require('./importer-js')
const {readCacheFilePy, insertImportPy} = require('./importer-py')
const {SETTINGS} = require('./settings')

const readCacheFile = {
  js: readCacheFileJs,
  py: readCacheFilePy,
}

const insertImport = {
  js: insertImportJs,
  py: insertImportPy,
}

async function selectImport() {
  let lang = path.extname(window.activeTextEditor.document.fileName).slice(1)
  if (lang === 'jsx') lang = 'js'
  const readFn = readCacheFile[lang]
  if (!readFn) return
  
  const selection = await window.showQuickPick(readFn())
  if (!selection) return

  insertImport[lang](selection)
}

module.exports = {
  selectImport,
}
