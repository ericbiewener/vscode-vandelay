import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'
import { basenameNoExt, getFilepathKey, isFile, last } from '../../utils'
import { isPathNodeModule, isIndexFile } from './utils'
import { parseImports, exportRegex } from './regex'
import {
  CachingDataJs,
  ExportType,
  FileExportsJs,
  NonFinalExportDataJs,
  NonFinalExportDatumJs,
  PluginJs,
  ReexportsToProcess,
} from './types'

// TODO: Break this function up
export function cacheFile(plugin: PluginJs, filepath: string, data: CachingDataJs) {
  const { imp, exp } = data
  const reexportsToProcess: ReexportsToProcess = {
    fullModules: [],
    selective: {},
  }
  const fileExports: NonFinalExportDatumJs = {
    named: [],
    types: [],
    reexportsToProcess,
  }
  const fileText = fs.readFileSync(filepath, 'utf8')
  const fileImports = parseImports(plugin, fileText)

  for (const importData of fileImports) {
    if (isPathNodeModule(plugin, importData.path)) {
      const existing = imp[importData.path] || {}
      imp[importData.path] = existing
      if (importData.default) existing.default = importData.default
      existing.named = _.union(existing.named, importData.named)
      existing.types = _.union(existing.types, importData.types)
    } else if (importData.default && importData.default.startsWith('* as')) {
      // import * as Foo from...
      const pathKey = getFilepathKey(
        plugin,
        path.resolve(path.dirname(filepath), `${importData.path}.js`) // Just guess at the file extension. Doesn't actually matter if it's right.
      )
      const existing = exp[pathKey] || {}
      if (existing.default) continue // don't overwrite default if it already exists
      exp[pathKey] = existing
      existing.default = importData.default
    }
  }

  let match
  let mainRegex
  let isTypescript

  if (plugin.useES5) {
    mainRegex = exportRegex.moduleExports
  } else {
    isTypescript = plugin.typescript || ['.ts', '.tsx'].includes(path.extname(filepath))
    mainRegex = isTypescript ? exportRegex.standardTypescript : exportRegex.standard
  }

  while ((match = mainRegex.exec(fileText))) {
    if (match[1] === 'default' || (plugin.useES5 && match[1])) {
      fileExports.default = isIndexFile(filepath)
        ? basenameNoExt(path.dirname(filepath))
        : basenameNoExt(filepath)
    } else if (!plugin.useES5 && !match[2] && !match[1].endsWith(',')) {
      // endsWith(',') — it's actually a reexport
      // export myVar  |  export myVar from ...
      fileExports.named.push(match[1])
    } else if (plugin.useES5 && match[2]) {
      // If any array or object exports were defined inline, strip those out so that our comm-based
      // string splitting will correctly split after each export
      const text = match[2]
        .replace(/\[[^]*?\]/gm, '')
        .replace(/{[^]*?}/gm, '')
        .replace(/\s/g, '')
      fileExports.named.push(
        ...text
          .split(',')
          .filter(Boolean)
          .map(exp => exp.split(':')[0])
      )
    } else if (match[2] && match[2] !== 'from') {
      // from — it's actually a reexport
      // `export class Foo extends`, `export class Foo implements`
      if (match[3] && match[3] !== 'extends' && match[3] !== 'implements') {
        if (!isTypescript) continue
        const exportType = match[2]
        const exportName = match[3]
        // `const enum Foo`, `export declare function declare_function(arg: any)`
        if (exportName && ['enum', 'function'].includes(exportType)) {
          fileExports.named.push(match[3])
        }
      } else {
        const key = match[1] === 'type' && !isTypescript ? 'types' : 'named'
        fileExports[key] = fileExports[key] || []
        fileExports[key].push(match[2])
      }
    }
  }

  if (!plugin.useES5) {
    const { fullModules, selective } = reexportsToProcess
    while ((match = exportRegex.fullRexport.exec(fileText))) fullModules.push(match[1])

    // match[1] = default
    // match[2] = export names
    // match[3] = path
    while ((match = exportRegex.selectiveRexport.exec(fileText))) {
      const subPath = match[3]
      if (!selective[subPath]) selective[subPath] = []
      const reexports = selective[subPath]

      if (match[1]) {
        fileExports.named = fileExports.named || []
        fileExports.named.push(match[1])
        // 'default' string used so that `buildImportItems` can suppress the subfile's default
        // export regardless of how the reexport location has named the variable
        // (https://goo.gl/SeH6MV). `match[1]` needed so that `buildImportItems` can suppress it when
        // importing from an adjacent/subfile (https://goo.gl/Ayk5Cg)
        reexports.push('default', match[1])
      }

      for (const exp of match[2].split(',')) {
        const trimmed = exp.trim()
        if (!trimmed) continue
        const words = trimmed.split(/ +/)
        const isType = words[0] === 'type'
        const key = isType ? 'types' : 'named'
        reexports.push(words[isType ? 1 : 0])
        fileExports[key] = fileExports[key] || []
        const word = last(words)
        if (word) fileExports[key].push(word)
      }
    }
  }

  if (!_.isEmpty(fileExports)) {
    const pathKey = getFilepathKey(plugin, filepath)
    const existing = exp[pathKey]
    // An existing default could be there from an earlier processed "import * as Foo from.." See https://goo.gl/JXXskw
    if (existing && existing.default && !fileExports.default) {
      fileExports.default = existing.default
    }
    fileExports.named.sort()
    fileExports.types.sort()
    exp[pathKey] = fileExports
  }

  exportRegex.standard.lastIndex = 0
  exportRegex.fullRexport.lastIndex = 0
  exportRegex.selectiveRexport.lastIndex = 0

  return data
}

/**
 * 1. Process reexports to add the actual export names to the file keys in which they're reexported.
 * 2. Flag all these as having been rexported so that `buildImportItems` can decide when to suppress
 *    them.
 * 3. Flag the reexports in their original file keys as having been reexported for the same reason.
 *
 * Note: If the reexport has been renamed (`export { x as y }`), it will not get filtered out when
 * importing from an adjacent/subfile. While solveable, this is probably an edge case to be ignored
 * (not to mention an undesireable API being created by the developer)
 */
export function processCachedData(data: CachingDataJs) {
  const { exp } = data
  for (const mainFilepath in exp) {
    const fileExports = exp[mainFilepath]
    if (!fileExports.reexportsToProcess) continue

    const { fullModules, selective } = fileExports.reexportsToProcess
    delete fileExports.reexportsToProcess
    const reexportNames: string[] = []

    if (selective) {
      for (const subfilePath in selective) {
        const subfileExportNames = selective[subfilePath]
        reexportNames.push(...subfileExportNames)
        const subfileExports = getSubfileExports(mainFilepath, subfilePath, exp)
        if (subfileExports) {
          if (!subfileExports.reexported) {
            subfileExports.reexported = {
              reexports: [],
              reexportPath: mainFilepath,
            }
          }
          subfileExports.reexported.reexports.push(...subfileExportNames)
        }
      }
    }

    if (fullModules) {
      for (const subfilePath of fullModules) {
        const subfileExports = getSubfileExports(mainFilepath, subfilePath, exp)
        if (!subfileExports || !subfileExports.named) return
        if (fileExports.named) {
          fileExports.named.push(...subfileExports.named)
        } else {
          fileExports.named = subfileExports.named
        }
        reexportNames.push(...subfileExports.named)
        // flag names in original export location
        subfileExports.reexported = {
          reexports: subfileExports.named,
          reexportPath: mainFilepath,
        }
      }
    }

    // flag names in `index.js` key
    if (reexportNames.length) fileExports.reexports = reexportNames
  }

  return data
}

function getSubfileExports(mainFilepath: string, filename: string, exp: NonFinalExportDataJs) {
  const filepathWithoutExt = path.join(path.dirname(mainFilepath), filename)
  for (const ext of ['.js', '.jsx']) {
    const subfileExports = exp[filepathWithoutExt + ext]
    if (subfileExports) return subfileExports
  }
}

