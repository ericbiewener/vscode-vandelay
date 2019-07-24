import fs from 'fs-extra'
import _ from 'lodash'
import path from 'path'
import { cacheFileManager } from '../../cacheFileManager'
import { isFile, mergeObjectsWithArrays, writeCacheFile } from '../../utils'
import { ExportDataImportsJs, FileExportsJs, PluginJs } from './types'

type Dep = Record<string, string>
type PackageJson = { dependencies?: Dep; devDependencies?: Dep; peerDependencies?: Dep }

export async function cacheNodeModules(plugin: PluginJs) {
  const readDirPromises: Promise<PackageJson | undefined>[] = []

  const items = await fs.readdir(plugin.projectRoot)
  for (const item of items) {
    if (item === 'node_modules' || item.startsWith('.')) continue
    const fullPath = path.join(plugin.projectRoot, item)
    readDirPromises.push(
      fs.stat(fullPath).then(async stats => (!stats.isFile() ? getPackageJsonData(fullPath) : null))
    )
  }

  const jsons = (await Promise.all(readDirPromises)).filter(Boolean) as PackageJson[]

  if (!jsons.length) {
    const json = getPackageJsonData(plugin.projectRoot)
    if (json) jsons.push(json)
  }

  const data: ExportDataImportsJs = {}
  await Promise.all(jsons.map(j => cacheDependencies(plugin, j, data)))

  console.log(data)

  return cacheFileManager(plugin, cachedData => {
    mergeObjectsWithArrays(cachedData.imp, data)
    return writeCacheFile(plugin, cachedData)
  })
}

async function cacheDependencies(
  plugin: PluginJs,
  packageJson: PackageJson,
  data: ExportDataImportsJs
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

// FIXME: possible to make `plugin` global as well, like contet, so that i don't have to pass it around?
export async function cacheDependency(
  plugin: PluginJs,
  dep: string
): Promise<FileExportsJs | undefined> {
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

  if (!packageJson.main) {
    console.info(`Vandelay: No "main" property in dependency package.json file: ${dep}`)
    return
  }

  let depExports
  try {
    // @ts-ignore
    depExports = __non_webpack_require__(path.join(dir, packageJson.main))
  } catch (e) {
    console.info(`Vandelay: Failed to parse main dependency file: ${dep}`)
    return
  }

  if (!depExports.__esModule) {
    return { default: getDefaultName(dep), named: [], types: [] }
  }

  const { default: defaultExport, ...rest } = depExports
  // Assume anything with an underscore is not desired, even if the underscore isn't the first
  // letter. For example, ReactDOM exports some stuff with the name `unstable_...`.
  const named = Object.keys(rest).filter(k => !k.includes('_'))
  if (!named.length) return
  return { default: defaultExport ? getDefaultName(dep) : null, named, types: [] }
}

function getPackageJsonData(dir: string) {
  const packageJsonPath = path.join(dir, 'package.json')
  if (!isFile(packageJsonPath)) return

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  } catch (e) {
    console.info('Vandelay: Failed to parse package.json file: ${packageJsonPath}')
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
