import { strUntil } from "../../utils";

export function isPathPackage(plugin, importPath) {
  if (importPath.startsWith(".")) return false;
  const pathStart = strUntil(importPath, ".");
  return !plugin.includePaths.some(p => {
    const relativePath = p.slice(plugin.projectRoot.length + 1);
    return strUntil(relativePath, "/") === pathStart;
  });
}
