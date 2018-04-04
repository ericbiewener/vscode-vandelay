const fs = require('fs')
const path = require('path')
const {SETTINGS} = require('./settings')

function writeCacheFile(lang, data) {
  const S = SETTINGS[lang]
  if (S.debug) console.log(data)
  
  fs.writeFileSync(
    S.cacheFile,
    JSON.stringify(data, null, S.debug ? 4 : null)
  )
}

function parseCacheFile(lang, includeExtraImports) {
  const S = SETTINGS[lang]

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

// TODO: rename. and does it make sense to have removeDirs be a part of this? that's a very different thing
// than just removing a file extension.
function trimPath(filepath, removeDirs) {
  const ext = path.extname(filepath)
  return removeDirs
    ? path.basename(filepath, ext)
    : ext ? filepath.slice(0, -ext.length) : filepath
}


function getCacheFilename(lang) {
  return '.vandelay-' + lang
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

module.exports = {
  writeCacheFile,
  parseCacheFile,
  isFile,
  trimPath,
  getCacheFilename,
  strBetween,
  parseLineImportPath,
  strUntil,
}
