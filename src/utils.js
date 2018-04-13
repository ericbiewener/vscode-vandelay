const fs = require('fs')
const makeDir = require('make-dir');
const path = require('path')

function writeCacheFile(plugin, data) {
  return makeDir(plugin.cacheDirPath).then(() => fs.writeFileSync(plugin.cacheFilePath, JSON.stringify(data)))
}

function parseCacheFile(plugin, includeExtraImports) {
  if (!isFile(plugin.cacheFilePath)) return

  const exportData = JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
  if (includeExtraImports && plugin.extraImports) Object.assign(exportData, plugin.extraImports)

  return exportData
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    return false
  }
}

// TODO: rename. and does it make sense to have removeDirs be a part of this? that's a very different thing
// than just removing a file extension.
function trimPath(filepath, removeDirs) {
  const ext = path.extname(filepath)
  return removeDirs
    ? path.basename(filepath, ext)
    : ext ? filepath.slice(0, -ext.length) : filepath
}

function strBetween(str, startChar, endChar) {
  const start = str.search(startChar)
  if (start < 0) return
  const substr = str.slice(start + 1)
  const end = substr.search(endChar || startChar)
  if (end < 0) return
  return substr.slice(0, end)
}

function parseLineImportPath(line) {
  return strBetween(line, /['"]/)
}

function strUntil(str, endChar) {
  const index = str.search(endChar)
  return index < 0 ? str : str.slice(0, index)
}

function getLangFromFilePath(filePath) {
  const ext = path.extname(filePath).slice(1)
  return ext === 'jsx' ? 'js' : ext
}

module.exports = {
  writeCacheFile,
  parseCacheFile,
  isFile,
  trimPath,
  strBetween,
  parseLineImportPath,
  strUntil,
  getLangFromFilePath,
}
