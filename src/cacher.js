const {window, workspace} = require('vscode')
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const {isFile, writeCacheFile, parseCacheFile} = require('./utils')
const {cacheJsFile, processReexports} = require('./cacher-js')
const {cachePyFile} = require('./cacher-py')
const {SETTINGS} = require('./settings')

const cacheFn = {
  js: cacheJsFile,
  py: cachePyFile,
}

function cacheDir(dir, lang, recursive=true, data={}, checkMatch=true) {
  const S = SETTINGS[lang]
  return fs.readdir(dir).then(items => {
    const readDirPromises = []

    for (const item of items) {
      const fullPath = path.join(dir, item)
      if (checkMatch && anymatch(S.excludePatterns, fullPath)) continue

      readDirPromises.push(
        fs.lstat(fullPath).then(stats => {
          if (stats.isFile()) {
            if (item === S.settingsFile) return
            const ext = path.extname(item).slice(1)
            if (!S.supportedExtensions.includes(ext)) return
            cacheFn[lang](fullPath, data)
          }
          else if (recursive) {
            return cacheDir(fullPath, lang, true, data)
          }
        })
      )
    }

    return Promise.all(readDirPromises)
  })
    .then(() => data)
}

function cacheProject() {
  return Promise.all(
    // Map over SETTINGS keys because it will contain only the languages for which a vandealy-*.js file exists
    _.map(SETTINGS, (S, lang) => {
      let cacher = Promise.all(S.includePaths.map(p => cacheDir(p, lang)))
        .then(exportObjArrays => (
          exportObjArrays.reduce((acc, obj) => Object.assign(acc, obj), {})
        ))

      if (lang === 'js') cacher = cacher.then(processReexports)
      return cacher.then(data => writeCacheFile(lang, data))
    })
  ).then(() => {
    window.showInformationMessage('Project exports have been cached.')
  })
}

function onWatchedFileChange(filepath, lang, wasDeleted=false) {
  const S = SETTINGS[lang]

  if (S.debug) console.log('watched file changed', filepath, wasDeleted)

  const dir = path.dirname(filepath)
  const cacher = S.lang === 'js' && isFile(path.join(dir, 'index.js'))
    ? cacheDir(dir, lang, false, {}, false).then(processReexports)
    : Promise.resolve(!wasDeleted && cacheFn[S.lang](filepath))

  const exportData = parseCacheFile() || {}
  if (wasDeleted) delete exportData[getFilepathKey(filepath)]

  cacher.then(data => {
    Object.assign(exportData, data)
    writeCacheFile(lang, exportData)
  })
}

function watchDirectoryTree(lang) {
  const S = SETTINGS[lang]

  return chokidar.watch(S.includePaths, {ignored: S.excludePatterns})
    .on('change', filepath => onWatchedFileChange(filepath, lang))
    .on('unlink', filepath => onWatchedFileChange(filepath, lang, true))
    .on('error', error => console.log('chokidar error: ' + error))
}

function getFilepathKey(filepath) {
  return filepath.slice(workspace.workspaceFolders[0].uri.path.length)
}

module.exports = {
  cacheProject,
  watchDirectoryTree,
  getFilepathKey,
  _test: {
    cacheDir,
    onWatchedFileChange,
  }
}
