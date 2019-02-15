import { Plugin } from '../../types'

export function isPathNodeModule(plugin: Plugin, importPath: string) {
  if (importPath.startsWith(".")) return false;
  return (
    !plugin.nonModulePaths ||
    !plugin.nonModulePaths.some(
      p => p === importPath || importPath.startsWith(p + "/")
    )
  );
}
