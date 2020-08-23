import fs from 'fs-extra'
import path from 'path'
import { spawnSync } from 'child_process'
import { isFile } from '@ericbiewener/utils/src/isFile'
import { isDirectory } from '@ericbiewener/utils/src/isDirectory'
import { cacheFileManager } from '../../../cacheFileManager'
import { cacheDir } from '../../../cacher'
import { context } from '../../../globals'
import { writeCacheFile } from '../../../utils'
import { CachingDataJs, ExportDataJs, ExportDataNodeModulesJs, PluginJs } from '../types'

export type Dep = Record<string, string>

const cacheNodeModulesBasedOnConfig = async (plugin: PluginJs) => {
  if (!plugin.dependencies) return

  const cachedData: Omit<CachingDataJs, 'nodeModules'> = { imp: {}, exp: {} }

  await Promise.all(
    Object.entries(plugin.dependencies).map(([depName, depDir]) => {
      const dir = path.join(plugin.projectRoot, 'node_modules', depName, depDir)
      if (isDirectory(dir)) return cacheDir(plugin, dir, cachedData, false)
    })
  )

  plugin.processCachedData(cachedData)

  const finalData: ExportDataNodeModulesJs = {}

  for (const k in cachedData.exp) {
    // Strip off `node_modules/` from key
    finalData[k.slice(13)] = {
      ...cachedData.exp[k],
      isExtraImport: true,
    }
  }

  return finalData
}

export async function cacheNodeModules(plugin: PluginJs) {
  const packageJsonPaths = findPackageJsonFiles(plugin)
  if (!packageJsonPaths.length) return

  const cacheScript = path.join(context().extensionPath, 'dist', 'cacheNodeModulesSandbox.js')
  const { error, stdout } = spawnSync('node', [
    cacheScript,
    plugin.projectRoot,
    JSON.stringify(packageJsonPaths),
  ])
  if (error) throw error

  const nodeModules = JSON.parse(stdout.toString().split('__vandelay__stdout__')[1])
  const configNodeModules = await cacheNodeModulesBasedOnConfig(plugin)

  Object.assign(nodeModules, configNodeModules)

  await cacheFileManager(plugin, async (cachedData) => {
    const newData = cachedData as ExportDataJs
    newData.nodeModules = nodeModules
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
