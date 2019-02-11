function isPathNodeModule(plugin, importPath) {
  if (importPath.startsWith(".")) return false;
  return (
    !plugin.nonModulePaths ||
    !plugin.nonModulePaths.some(
      p => p === importPath || importPath.startsWith(p + "/")
    )
  );
}

module.exports = {
  isPathNodeModule
};
