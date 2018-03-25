const path = require('path')
const fs = require('fs-extra')
const chokidar = require('chokidar')
const anymatch = require('anymatch')
const {isFile, parseCacheFile} = require('./utils')
const {SETTINGS_FILENAME, INDEX_JS} = require('./constants')
const {cacheJsFile, processReexports} = require('./cacher-js')
const {cachePyFile} = require('./cacher-py')
const {getSettings} = require('./settings')

const cacheFn = {
  JS: cacheJsFile,
  PY: cachePyFile,
}

function cacheDir(dir, recursive=true, data={}, checkMatch=true) {
  const S = getSettings()

  return fs.readdir(dir).then(items => {
    const readDirPromises = []

    for (const item of items) {
      const fullPath = path.join(dir, item)
      if (checkMatch && anymatch(S.excludePatterns, fullPath)) continue

      readDirPromises.push(
        fs.lstat(fullPath).then(stats => {
          if (stats.isFile()) {
            if (item === SETTINGS_FILENAME[S.lang]) return
            const ext = path.extname(item).slice(1)
            if (ext !== S.lang && !(ext === 'jsx' && S.lang === 'js')) return
            cacheFn[S.lang](fullPath, data)
          }
          else if (recursive) {
            return cacheDir(fullPath, true, data)
          }
        })
      )
    }

    return Promise.all(readDirPromises)
  })
    .then(() => data)
}

function cacheProject() {
  const S = getSettings()
  let cacher = Promise.all(S.includePaths.map(p => cacheDir(p)))
    .then(exportObjArrays => (
      exportObjArrays.reduce((acc, obj) => Object.assign(acc, obj), {})
    ))

  if (S.lang === 'js') cacher = cacher.then(processReexports)
  return cacher.then(writeCacheFile)
}

function onWatchedFileChange(filepath, lang, wasDeleted=false) {
  console.log(filepath)
  const S = getSettings(lang)

  if (S.debug) console.log('watched file changed', filepath, wasDeleted)

  const dir = path.dirname(filepath)
  const cacher = S.lang === 'js' && isFile(path.join(dir, INDEX_JS))
    ? cacheDir(dir, false, {}, false).then(processReexports)
    : Promise.resolve(!wasDeleted && cacheFn[S.lang](filepath))

  const exportData = parseCacheFile() || {}
  if (wasDeleted) delete exportData[getFilepathKey(filepath)]

  cacher.then(data => {
    Object.assign(exportData, data)
    writeCacheFile(exportData)
  })
}

function watchDirectoryTree(lang) {
  const S = getSettings(lang)

  return chokidar.watch(S.includePaths, {ignored: S.excludePatterns})
    .on('change', filepath => onWatchedFileChange(filepath, lang))
    .on('unlink', filepath => onWatchedFileChange(filepath, lang, true))
    .on('error', error => console.log('chokidar error: ' + error))
}

function writeCacheFile(data) {
  const S = getSettings()

  if (S.debug) console.log(data)
  fs.writeFileSync(
    S.cacheFile,
    JSON.stringify(data, null, S.debug ? 4 : null)
  )
}

function getFilepathKey(filepath) {
  return filepath.slice(getSettings().projectRoot.length)
}

module.exports = {
  cacheProject,
  watchDirectoryTree,
  getFilepathKey,
}
