import fs from 'fs-extra'
import path from 'path'
import { ExportDataNodeModulesJs, NodeModuleExports } from '../types'
import { Dep } from './cacheNodeModules'

type PackageJson = { dependencies?: Dep; devDependencies?: Dep; peerDependencies?: Dep }

const projectRoot = process.argv[2]
const packageJsonPaths = JSON.parse(process.argv[3])

async function main() {
  const jsons = []
  for (const packageJsonPath of packageJsonPaths) {
    try {
      jsons.push(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')))
    } catch (e) {
      console.info('Vandelay: Failed to parse package.json file: ${packageJsonPath}')
    }
  }

  const data: ExportDataNodeModulesJs = {}
  await Promise.all(jsons.map(j => cacheDependencies(j, data)))
  process.stdout.write(`__vandelay__stdout__${JSON.stringify(data)}__vandelay__stdout__`)
}

async function cacheDependencies(
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
      const fileExports = await cacheDependency(d)
      if (fileExports) data[d] = fileExports
    })
  )
}



// FIXME: possible to make `plugin` global as well, like context, so that i don't have to pass it
// around? The difference would be that it gets set at the start of each command, whereas context
// would never change.
export async function cacheDependency(
  dep: string
): Promise<NodeModuleExports | undefined> {
  const dir = path.join(projectRoot, 'node_modules', dep)
  const packageJsonPath = path.join(dir, 'package.json')

  let packageJson
  try {
    const fileText = await fs.readFile(packageJsonPath, 'utf8')
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
  const pathParts = dep.split('/')
  const packageName = pathParts[pathParts.length -1]
  const parts = packageName.split('-')
  const capitalized = parts
    .slice(1)
    .map(s => `${s[0].toUpperCase()}${s.slice(1)}`)
    .join('')

  return `${parts[0]}${capitalized}`
}

function isFile(file: string) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    if (e.code !== 'ENOENT') throw e // File might exist, but something else went wrong (e.g. permissions error)
    return false
  }
}

main()
