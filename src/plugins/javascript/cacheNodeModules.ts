import fs from 'fs-extra'
import _ from 'lodash'
import path from 'path'
import { cacheFileManager } from '../../cacheFileManager'
import { isFile, writeCacheFile } from '../../utils'
import { ExportDataJs, ExportDataNodeModulesJs, NodeModuleExports, PluginJs } from './types'

type Dep = Record<string, string>
type PackageJson = { dependencies?: Dep; devDependencies?: Dep; peerDependencies?: Dep }

export async function cacheNodeModules(plugin: PluginJs) {
  const jsons = []
  for (const packageJsonPath of findPackageJsonFiles(plugin)) {
    try {
      jsons.push(JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')))
    } catch (e) {
      console.info('Vandelay: Failed to parse package.json file: ${packageJsonPath}')
    }
  }

  const data: ExportDataNodeModulesJs = {}
  await Promise.all(jsons.map(j => cacheDependencies(plugin, j, data)))
  console.log('DONE CACHING DEPENDENCY')

  await cacheFileManager(plugin, async cachedData => {
    const newData = cachedData as ExportDataJs
    newData.nodeModules = data
    await writeCacheFile(plugin, newData)
  })
}

async function cacheDependencies(
  plugin: PluginJs,
  packageJson: PackageJson,
  data: ExportDataNodeModulesJs
) {
  const deps = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ]

  await Promise.all(
    deps.map(async d => {
      if (d.startsWith('@types')) return
      const fileExports = await cacheDependency(plugin, d)
      if (fileExports) data[d] = fileExports
    })
  )
}

// FIXME: possible to make `plugin` global as well, like context, so that i don't have to pass it
// around? The difference would be that it gets set at the start of each command, whereas context
// would never change.
export async function cacheDependency(
  plugin: PluginJs,
  dep: string
): Promise<NodeModuleExports | undefined> {
  console.log('CACHING DEPENDENCY')
  const dir = path.join(plugin.projectRoot, 'node_modules', dep)
  const packageJsonPath = path.join(dir, 'package.json')
  let packageJson
  try {
    const fileText = await fs.readFile(packageJsonPath, 'utf-8')
    packageJson = JSON.parse(fileText)
  } catch (e) {
    console.info(`Vandelay: Failed to parse dependency package.json file: ${dep}`)
    return
  }

  const mainFile = path.join(dir, packageJson.main || 'index.js')

  if (!isFile(mainFile)) {
    console.info(`Vandelay: Couldn't determine entry point for node module: ${dep}`)
    return
  }

  let depExports
  try {
    // @ts-ignore
    depExports = __non_webpack_require__(mainFile)
  } catch (e) {
    console.info(`Vandelay: Failed to parse main dependency file: ${mainFile}`)
    return
  }

  if (!depExports.__esModule) {
    return { default: getDefaultName(dep), named: [], types: [], isExtraImport: true }
  }

  const { default: defaultExport, ...rest } = depExports
  // Assume anything with an underscore is not desired, even if the underscore isn't the first
  // letter. For example, ReactDOM exports some stuff with the name `unstable_...`.
  const named = Object.keys(rest).filter(k => !k.includes('_'))
  if (!named.length) return
  return {
    default: defaultExport ? getDefaultName(dep) : null,
    named,
    types: [],
    isExtraImport: true,
  }
}

function getDefaultName(dep: string) {
  const packageName = _.last(dep.split('/')) as string
  const parts = packageName.split('-')
  const capitalized = parts
    .slice(1)
    .map(_.upperFirst)
    .join('')

  return `${parts[0]}${capitalized}`
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

        t packageJsonPath = getPackageJsonPath(fullPath)
        packageJsonPath) results.push(packageJsonPath)
  }
   // If no results yet, then look in project root.
  if  !results.length) {
        t packageJsonPath = getPackageJsonPath(plugin.projectRoot)
        packageJsonPath) results.push(packageJsonPath)
  }
   re  rn results
}

function getPackageJsonPath(dir: string) {
  co  t packageJsonPath = path.join(dir, 'package.json')
  re  rn isFile(packageJsonPath) ? packageJsonPath : null
}
