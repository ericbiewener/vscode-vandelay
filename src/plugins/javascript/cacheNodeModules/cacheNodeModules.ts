import fs from 'fs-extra'
import _ from 'lodash'
import path from 'path'
import { spawnSync } from 'child_process'
import { cacheFileManager } from '../../../cacheFileManager'
import { context } from '../../../globals'
import { isFile, writeCacheFile } from '../../../utils'
import { ExportDataJs, ExportDataNodeModulesJs, NodeModuleExports, PluginJs } from '../types'

export type Dep = Record<string, string>

export async function cacheNodeModules(plugin: PluginJs) {
  const packageJsonPaths = findPackageJsonFiles(plugin)
  if (!packageJsonPaths.length) return

  

  const cacheScript = path.join(context().extensionPath, 'dist', 'cacheNodeModulesSandbox.js')
  const { error, stdout } = spawnSync('node', [cacheScript, plugin.projectRoot, JSON.stringify(packageJsonPaths)]);
  if (error) throw error

  await cacheFileManager(plugin, async cachedData => {
    const newData = cachedData as ExportDataJs
    newData.nodeModules = JSON.parse(stdout.toString().split('__vandelay__stdout__')[1])
    await writeCacheFile(plugin, newData)
  })
}

export function findPackageJsonFiles(plugin: PluginJs) {
  const results = []
  // First check if subdirectories of root have `package.json` files. If they do, we're looking at a
  // yarn workspace and we probably want to parse the subdirectory modules rather than those in the
  // project root.
  for (const item of fs.readdirSync(plugin.projectRoot)) {
    if (item === 'node_modules' || item.startsWith('.')) continue
    const fullPath = path.join(plugin.projectRoot, item)
    if (isFile(fullPath)) continue

    const packageJsonPath = getPackageJsonPath(fullPath)
    if (packageJsonPath) results.push(packageJsonPath)
  }

  // If no results yet, then look in project root.
  if (!results.length) {
    const packageJsonPath = getPackageJsonPath(plugin.projectRoot)
    if (packageJsonPath) results.push(packageJsonPath)
  }

  return results
}

function getPackageJsonPath(dir: string) {
  const packageJsonPath = path.join(dir, 'package.json')
  return isFile(packageJsonPath) ? packageJsonPath : null
}
