const {window, workspace} = require('vscode')
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const anymatch = require('anymatch')
const {writeCacheFile, getLangFromFilePath, getFilepathKey} = require('./utils')
const {cacheFileManager} = require('./cacheFileManager')
const {PLUGINS} = require('./plugins')

function shouldIgnore(plugin, filePath) {
  return anymatch(plugin.excludePatterns, filePath)
}

function cacheDir(plugin, dir, recursive=true, data={_extraImports: {}}) {
  return fs.readdir(dir).then(items => {
    const readDirPromises = []

    for (const item of items) {
      const fullPath = path.join(dir, item)
      if (shouldIgnore(plugin, fullPath)) continue

      readDirPromises.push(
        fs.lstat(fullPath).then(stats => {
          if (stats.isFile()) {
            if (plugin.language !== getLangFromFilePath(item) || item === plugin.configFile) return
            plugin.cacheFile(plugin, fullPath, data)
          }
          else if (recursive) {
            return cacheDir(plugin, fullPath, true, data)
          }
        })
      )
    }

    return Promise.all(readDirPromises)
  })
    .then(() => data)
}

function cacheProjectLanguage(plugin) {
  let cacher = Promise.all(plugin.includePaths.map(p => cacheDir(plugin, p)))
    .then(exportObjArrays => (
      exportObjArrays.reduce((acc, obj) => Object.assign(acc, obj), {})
    ))

  if (plugin.processCachedData) cacher = cacher.then(plugin.processCachedData)
  return cacher.then(data => writeCacheFile(plugin, data))
}

function cacheProject() {
  return Promise.all(_.map(PLUGINS, cacheProjectLanguage))
    .then(() => window.showInformationMessage('Project exports have been cached. 🦄'))
}

function onChangeOrCreate(doc) {
  const plugin = PLUGINS[getLangFromFilePath(doc.path)]
  if (!plugin || shouldIgnore(plugin, doc.path)) return
  
  const data = plugin.cacheFile(plugin, doc.path)
  if (_.isEmpty(data)) return

  _.find(data, (v, k) => k !== '_extraImports').cached = Date.now()
  _.each(data._extraImports, data => data.isExtraImport = true);

  cacheFileManager(plugin, cachedData => {
    // Concatenate & dedupe named/types arrays. Merge them into data._extraImports since that will in turn get
    // merged back into cachedData
    _.mergeWith(data._extraImports, cachedData._extraImports, (a, b) => {
      if (_.isArray(a)) return _.union(a, b)
    })
    return writeCacheFile(plugin, Object.assign(cachedData, data))
  })
}

function watchForChanges() {
  // TODO: kill on deactivate?
  const watcher = workspace.createFileSystemWatcher('**/*.*')

  watcher.onDidChange(onChangeOrCreate)
  watcher.onDidCreate(onChangeOrCreate)
  
  watcher.onDidDelete(doc => {
    const plugin = PLUGINS[getLangFromFilePath(doc.path)]
    if (!plugin) return
    
    cacheFileManager(plugin, cachedData => {
      const key = getFilepathKey(plugin, doc.path)
      if (!cachedData[key]) return
      delete cachedData[key]
      return writeCacheFile(plugin, cachedData)
    })
  })
}

module.exports = {
  cacheProject,
  cacheProjectLanguage,
  watchForChanges,
  getFilepathKey,
  _test: {
    cacheDir,
  }
}
