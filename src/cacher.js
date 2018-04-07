const {window, workspace} = require('vscode')
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const anymatch = require('anymatch')
const {isFile, writeCacheFile, parseCacheFile} = require('./utils')
const {cacheJsFile, processReexports} = require('./cacher-js')
const {cachePyFile} = require('./cacher-py')
const {SETTINGS} = require('./settings')

const cacheFn = {
  js: cacheJsFile,
  py: cachePyFile,
}

function getLangFromFilePath(filePath) {
  const ext = path.extname(filePath).slice(1)
  return ext === 'jsx' ? 'jsx' : ext
}

function shouldIgnore(lang, filePath) {
  const S = SETTINGS[lang]
  return anymatch(S.excludePatterns, filePath)
}

function cacheDir(dir, lang, recursive=true, data={}) {
  const S = SETTINGS[lang]
  return fs.readdir(dir).then(items => {
    const readDirPromises = []

    for (const item of items) {
      const fullPath = path.join(dir, item)
      if (shouldIgnore(lang, fullPath)) continue

      readDirPromises.push(
        fs.lstat(fullPath).then(stats => {
          if (stats.isFile()) {
            if (item === S.settingsFile) return
            if (lang !== getLangFromFilePath(item)) return
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

function onChangeOrCreate(doc) {
  const lang = getLangFromFilePath(doc.path)
  if (!SETTINGS[lang] || shouldIgnore(lang, doc.path)) return
  
  const data = cacheFn[lang](doc.path)
  if (!Object.keys(data).length) return

  // include initial {} in Object.assign in case parseCacheFile returns undefined
  writeCacheFile(lang, Object.assign({}, parseCacheFile(lang), data))
}

function watchForChanges() {
  // TODO: kill on deactivate?
  const watcher = workspace.createFileSystemWatcher('**/*.*')

  watcher.onDidChange(onChangeOrCreate)
  watcher.onDidCreate(onChangeOrCreate)
  
  watcher.onDidDelete(doc => {
    const lang = getLangFromFilePath(doc.path)
    const data = parseCacheFile(lang) || {}
    const key = getFilepathKey(doc.path)
    if (!data[key]) return
    delete data[key]
    writeCacheFile(lang, data)
  })
}

function getFilepathKey(filepath) {
  return filepath.slice(workspace.workspaceFolders[0].uri.path.length)
}

module.exports = {
  cacheProject,
  watchForChanges,
  getFilepathKey,
  _test: {
    cacheDir,
    onWatchedFileChange,
  }
}
