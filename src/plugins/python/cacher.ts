import fs from 'fs-extra'
import _ from 'lodash'
import { getFilepathKey } from '../../utils'
import { isPathPackage } from './utils'
import { parseImports } from './regex'
import { PluginPy, CachingDataPy } from './types'

export function cacheFile(
  plugin: PluginPy,
  filepath: string,
  data: CachingDataPy
) {
  const { imp, exp } = data
  const fileText = fs.readFileSync(filepath, 'utf8')
  const imports = parseImports(fileText)

  for (const importData of imports) {
    if (isPathPackage(plugin, importData.path)) {
      const existing = imp[importData.path] || {}
      imp[importData.path] = existing
      if (importData.imports) {
        existing.exports = _.union(existing.exports, importData.imports)
      } else {
        existing.importEntirePackage = true
      }
    }
    // If there are imports then they'll get added to the cache when that file gets cached. For
    // now, we only need to worry about whether then entire file is being imported
    else if (!importData.imports) {
      exp[importData.path] = { importEntirePackage: true }
    }
  }

  const classes = []
  const functions = []
  const constants = []
  const lines = fileText.split('\n')

  for (const line of lines) {
    const words = line.split(' ')
    const word0 = words[0]
    const word1 = words[1]

    if (word0 === 'class') {
      classes.push(trimClassOrFn(word1))
    } else if (word0 === 'def') {
      // Don't export private functions
      if (!word1.startsWith('_')) functions.push(trimClassOrFn(word1))
    } else if (word1 === '=' && word0.toUpperCase() === word0) {
      constants.push(word0)
    }
  }

  const fileExports = [
    ...classes.sort(),
    ...functions.sort(),
    ...constants.sort(),
  ]
  if (fileExports.length)
    exp[getFilepathKey(plugin, filepath)] = { exports: fileExports }

  return data
}

function trimClassOrFn(str: string) {
  return str.slice(0, str.indexOf('('))
}
