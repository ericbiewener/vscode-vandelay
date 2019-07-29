import fs from 'fs-extra'
import readdir from 'recursive-readdir'
import { cacheFileManager } from '../../../cacheFileManager'
import { shouldIgnore } from '../../../cacher'
import * as globals from '../../../globals'
import { processFileImports } from '../cacher'
import { parseImports } from '../regex'
import { CachingDataJs, ExportDataJs, PluginJs } from '../types'

export async function findUnusedExports(plugin: PluginJs) {
  const results = await Promise.all(plugin.includePaths.map(dir => getUsedExports(plugin, dir)))

  return cacheFileManager(plugin, exportData => {})
}

async function getUsedExports(plugin: PluginJs, dir: string) {
  const files = await readdir(dir, [filepath => shouldIgnore(plugin, filepath)])
  const data: CachingDataJs = { imp: {}, exp: {}, nodeModules: {} }

  for (const filepath of files) {
    const fileText = fs.readFileSync(filepath, 'utf8')
    processFileImports(plugin, filepath, fileText, data, true)
  }

  return data
}
