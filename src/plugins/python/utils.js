function isPathPackage(plugin, importPath) {
  if (importPath.startsWith(".")) return false;
  const pathStart = plugin.utils.strUntil(importPath, ".");
  return !plugin.includePaths.some(p => {
    const relativePath = p.slice(plugin.projectRoot.length + 1);
    return plugin.utils.strUntil(relativePath, "/") === pathStart;
  });
}

function shouldIncludeDisgnostic({ code }) {
  return code === "F821";
}

module.exports = {
  isPathPackage,
  shouldIncludeDisgnostic
};
