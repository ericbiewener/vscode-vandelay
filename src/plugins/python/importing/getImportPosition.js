const _ = require("lodash");
const { commentRegex } = require("../regex");
const { isPathPackage } = require("../utils");

/**
 * Determine which line number should get the import. This could be merged into that line
 * if they have the same path (resulting in lineIndexModifier = 0), or inserted as an entirely
 * new import line before or after (lineIndexModifier = -1 or 1)
 **/

function getImportPosition(plugin, importPath, isExtraImport, imports, text) {
  // If no imports, find first non-comment line
  if (!imports.length) {
    return {
      match: plugin.utils.getLastInitialComment(text, commentRegex),
      indexModifier: 1,
      isFirstImport: true
    };
  }

  // First look for an exact match. This is done outside the main sorting loop because we don't care
  // where the exact match is located if it exists.
  const exactMatch = imports.find(i => i.path === importPath);
  if (exactMatch) {
    return { match: exactMatch, indexModifier: 0 };
  }

  const importPos = plugin.utils.getImportOrderPosition(
    plugin.utils.strUntil(importPath, ".")
  );
  const importIsAbsolute = !importPath.startsWith(".");

  for (const importData of imports) {
    // Package check
    const lineIsPackage = isPathPackage(plugin, importData.path);
    if (lineIsPackage && !isExtraImport) continue;

    const lineImportPos = plugin.utils.getImportOrderPosition(
      plugin.utils.strUntil(importData.path, ".")
    );

    // Both have import orders
    if (importPos != null && lineImportPos != null) {
      if (importPos > lineImportPos) continue;
      return {
        match: importData,
        indexModifier:
          importPos < lineImportPos || importPath < importData.path ? -1 : 1
      };
    }

    // One is a package and the other isn't
    if (isExtraImport && !lineIsPackage) {
      return { match: importData, indexModifier: -1 };
    } else if (!isExtraImport && lineIsPackage) {
      continue;
    }

    // IF one has a position and the other doesn't...
    if (importPos != null || lineImportPos != null) {
      // Package imports without a group get sorted to the top, non-package imports without a group
      // get sorted to the end
      if (
        (isExtraImport && importPos != null) ||
        (!isExtraImport && lineImportPos != null)
      )
        continue;
      return {
        match: importData,
        indexModifier: -1
      };
    }

    if (isExtraImport && (!lineIsPackage || importPath < importData.path)) {
      return { match: importData, indexModifier: -1 };
    } else if (lineIsPackage) {
      continue;
    }

    // Absolute path comparison. This also handles the case where both paths are packages, causing
    // them to get compared alphabetically.
    const lineIsAbsolute = !importData.path.startsWith(".");
    if (importIsAbsolute && (!lineIsAbsolute || importPath < importData.path)) {
      return { match: importData, indexModifier: -1 };
    } else if (lineIsAbsolute) {
      continue;
    }
  }

  // Since we didn't find a line to sort the new import before, it will go after the last import
  return {
    match: _.last(imports),
    indexModifier: 1
  };
}

module.exports = {
  getImportPosition
};
