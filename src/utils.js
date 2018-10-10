const fs = require('fs')
const makeDir = require('make-dir')
const path = require('path')
const _ = require('lodash')
const { window } = require('vscode')

const extensionToLang = {
  jsx: 'js',
  mjs: 'js',
}

function writeCacheFile(plugin, data) {
  _.each(data._extraImports, d => (d.isExtraImport = true))
  return makeDir(plugin.cacheDirPath).then(() =>
    fs.writeFileSync(plugin.cacheFilePath, JSON.stringify(data))
  )
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    if (e.code !== 'ENOENT') throw e // File might exist, but something else went wrong (e.g. permissions error)
    return false
  }
}

function getLangFromFilePath(filePath) {
  const ext = path.extname(filePath).slice(1)
  return extensionToLang[ext] || ext
}

function getPluginForActiveFile() {
  if (!window.activeTextEditor) return
  const { PLUGINS } = require('./plugins')
  const plugin =
    PLUGINS[getLangFromFilePath(window.activeTextEditor.document.fileName)]
  if (!plugin)
    window.showErrorMessage('No Vandelay plugin found for current file type.')
  return plugin
}

function getFilepathKey(plugin, filepath) {
  return filepath.slice(plugin.projectRoot.length + 1)
}

// Extracted for sharing with plugins for testing
function getImportItems(plugin, exportData, buildImportItems) {
  Object.assign(exportData, exportData._extraImports)
  delete exportData._extraImports
  if (exportData)
    return (buildImportItems || plugin.buildImportItems)(plugin, exportData)
}

module.exports = {
  writeCacheFile,
  isFile,
  getLangFromFilePath,
  getPluginForActiveFile,
  getFilepathKey,
  getImportItems,
}
