import { Uri, workspace } from 'vscode'
import path from 'path'
import fs from 'fs-extra'
import _ from 'lodash'
import anymatch from 'anymatch'
import {
  getFilepathKey,
  getLangFromFilePath,
  getPluginForFile,
  mergeObjectsWithArrays,
  showProjectExportsCachedMessage,
  writeCacheFile,
} from './utils'
import { cacheFileManager } from './cacheFileManager'
import { PLUGINS } from './plugins'
import { Plugin, CachingData } from './types'

function shouldIgnore(plugin: Plugin, filePath: string) {
  return anymatch(plugin.excludePatterns, filePath)
}

async function cacheDir(
  plugin: Plugin,
  dir: string,
  recursive: boolean,
  data: CachingData
): Promise<CachingData> {
  const items = await fs.readdir(dir)
  const readDirPromises: Promise<any>[] = []

  for (const item of items) {
    const fullPath = path.join(dir, item)
    if (item === plugin.configFile || shouldIgnore(plugin, fullPath)) continue

    readDirPromises.push(
      fs.stat(fullPath).then(async stats => {
        if (stats.isFile()) {
          if (plugin.language === getLangFromFilePath(item)) {
            await plugin.cacheFile(plugin, fullPath, data)
          }
        } else if (recursive) {
          await cacheDir(plugin, fullPath, true, data)
        }

        return Promise.resolve()
      })
    )
  }

  await Promise.all(readDirPromises)
  return data
}

export async function cacheProjectLanguage(plugin: Plugin) {
  if (!plugin.includePaths.length) return

  let cacher = Promise.all(
    plugin.includePaths.map(p => cacheDir(plugin, p, true, { imp: {}, exp: {} }))
  ).then(cachedDirTrees => {
    const finalData = { exp: {}, imp: {} }
    for (const { exp, imp } of cachedDirTrees) {
      Object.assign(finalData.exp, exp)
      // Merge extra import arrays
      mergeObjectsWithArrays(finalData.imp, imp)
    }
    return finalData
  })

  if (plugin.processCachedData) cacher = cacher.then(plugin.processCachedData)
  return cacher.then(data => writeCacheFile(plugin, data))
}

export function cacheProject() {
  return Promise.all(_.map(PLUGINS, cacheProjectLanguage)).then(showProjectExportsCachedMessage)
}

function onChangeOrCreate(doc: Uri) {
  const plugin = getPluginForFile(doc.fsPath)
  if (
    !plugin ||
    shouldIgnore(plugin, doc.fsPath) ||
    // TODO: Since we are watching all files in the workspace, not just those in plugin.includePaths,
    // we need to make sure that it is actually in that array. Can this be changed so that we only
    // watch files in plugin.includePaths to begin with? Not sure if this can be accomplished with
    // a single glob. If not, we'd need multiple watchers. Would either case be more efficient than
    // what we're currently doing?
    !plugin.includePaths.some(p => doc.fsPath.startsWith(p))
  )
    return

  const { exp, imp } = plugin.cacheFile(plugin, doc.fsPath, {
    imp: {},
    exp: {},
  })
  if (_.isEmpty(exp) && _.isEmpty(imp)) return

  for (const k in exp) exp[k].cached = Date.now()

  return cacheFileManager(plugin, cachedData => {
    // Concatenate & dedupe named/types arrays. Merge them into extraImports since that will in turn get
    // merged back into cachedData
    mergeObjectsWithArrays(cachedData.imp, imp)
    Object.assign(cachedData.exp, exp)

    return writeCacheFile(plugin, cachedData)
  })
}

export function watchForChanges() {
  const watcher = workspace.createFileSystemWatcher('**/*.*')

  watcher.onDidChange(onChangeOrCreate)
  watcher.onDidCreate(onChangeOrCreate)

  watcher.onDidDelete(doc => {
    const plugin = getPluginForFile(doc.fsPath)
    if (!plugin) return

    cacheFileManager(plugin, cachedData => {
      const key = getFilepathKey(plugin, doc.fsPath)
      const { exp } = cachedData
      if (!exp[key]) return
      delete exp[key]
      return writeCacheFile(plugin, cachedData)
    })
  })

  return watcher
}
