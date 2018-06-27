const fs = require('fs')
const makeDir = require('make-dir')
const path = require('path')

function writeCacheFile(plugin, data) {
  return makeDir(plugin.cacheDirPath).then(() => fs.writeFileSync(plugin.cacheFilePath, JSON.stringify(data)))
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
  return ext === 'jsx' ? 'js' : ext
}

function getFilepathKey(plugin, filepath) {
  return filepath.slice(plugin.projectRoot.length + 1)
}

module.exports = {
  writeCacheFile,
  isFile,
  getLangFromFilePath,
  getFilepathKey,
}
