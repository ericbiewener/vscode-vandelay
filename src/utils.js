const fs = require('fs')
const path = require('path')
const {getSettings} = require('./settings')

function parseCacheFile(includeExtraImports) {
  const S = getSettings()

  if (!isFile(S.cacheFile)) return

  const exportData = JSON.parse(fs.readFileSync(S.cacheFile, 'utf-8'))
  if (includeExtraImports && S.extraImports) Object.assign(exportData, S.extraImports)

  return exportData
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    return false
  }
}

function trimPath(filepath, removeDirs) {
  const ext = path.extname(filepath)

  return removeDirs
    ? path.basename(filepath, ext)
    : ext ? filepath.slice(0, -ext.length) : filepath
}


function getCacheFilename(lang) {
  return '.vandelay-' + lang.toLowerCase()
}

module.exports = {
  parseCacheFile,
  isFile,
  trimPath,
  getCacheFilename,
}
