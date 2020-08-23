import { isFile } from '@ericbiewener/utils/src/isFile'
import fs from 'fs-extra'
import path from 'path'
import { ExportDataNodeModulesJs, NodeModuleExports } from '../types'
import { Dep } from './cacheNodeModules'
import { parsePackageJson } from './parsePackageJson'

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
  await Promise.all(jsons.map((j) => cacheDependencies(j, data)))
  process.stdout.write(`__vandelay__stdout__${JSON.stringify(data)}__vandelay__stdout__`)
}

async function cacheDependencies(packageJson: PackageJson, data: ExportDataNodeModulesJs) {
  const deps = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ]

  await Promise.all(
    deps.map(async (d) => {
      if (d.startsWith('@types')) return
      const fileExports = await cacheDependency(d)
      if (fileExports) data[d] = fileExports
    })
  )
}

export async function cacheDependency(depName: string): Promise<NodeModuleExports | undefined> {
  const packageJson = await parsePackageJson(projectRoot, depName)
  if (!packageJson) return

  const mainFile = path.join(depName, packageJson.main || 'index.js')

  if (!isFile(mainFile)) {
    console.info(`Vandelay: Couldn't determine entry point for node module: ${depName}`)
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
    return { default: getDefaultName(depName), named: [], types: [], isExtraImport: true }
  }

  const { default: defaultExport, ...rest } = depExports
  // Assume anything with an underscore is not desired, even if the underscore isn't the first
  // letter. For example, ReactDOM exports some stuff with the name `unstable_...`.
  const named = Object.keys(rest).filter((k) => !k.includes('_'))
  if (!named.length) return

  return {
    default: defaultExport ? getDefaultName(depName) : null,
    named,
    types: [],
    isExtraImport: true,
  }
}

function getDefaultName(dep: string) {
  const pathParts = dep.split('/')
  const packageName = pathParts[pathParts.length - 1]
  const parts = packageName.split('-')
  const capitalized = parts
    .slice(1)
    .map((s) => `${s[0].toUpperCase()}${s.slice(1)}`)
    .join('')

  return `${parts[0]}${capitalized}`
}

main()
