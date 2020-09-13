import path from 'path'
import { PluginJs } from './types'

export function isPathNodeModule(plugin: PluginJs, importPath: string) {
  if (importPath.startsWith('.')) return false
  return (
    !plugin.nonModulePaths ||
    !plugin.nonModulePaths.some((p) => p === importPath || importPath.startsWith(p + '/'))
  )
}

export function isIndexFile(filepath: string) {
  return path.basename(filepath).startsWith('index.')
}
