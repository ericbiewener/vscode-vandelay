const fs = require('fs')
const { isFile } = require('./utils')

let fileAccess

function parseCacheFile(plugin) {
  return isFile(plugin.cacheFilePath)
    ? JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
    : {}
}

/**
 * Block access to the cache file until a previous accessor has finished its operations.
 * This prevents race conditions resulting in the last accessor overwriting prior ones' data.
 *
 * `cb` should return a promise (e.g. any file writing operations) so that it completes before the next call
 * to the cacheFileManager
 */
function cacheFileManager(plugin, cb) {
  if (fileAccess) {
    fileAccess = fileAccess.then(() => cb(parseCacheFile(plugin)))
  } else {
    fileAccess = Promise.resolve(cb(parseCacheFile(plugin)))
  }
  return fileAccess
}

module.exports = {
  cacheFileManager,
}
