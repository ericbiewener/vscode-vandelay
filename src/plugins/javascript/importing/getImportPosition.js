const _ = require("lodash");
const {
  getImportOrderPosition,
  getLastInitialComment
} = require("../../../utils");
const { commentRegex } = require("../regex");
const { isPathNodeModule } = require("../utils");
const { ExportType } = require("./buildImportItems");

/**
 * Determine which line number should get the import. This could be merged into that line
 * if they have the same path (resulting in indexModifier = 0), or inserted as an entirely
 * new import line before or after (indexModifier = -1 or 1)
 **/

function getImportPosition(
  plugin,
  exportType,
  importPath,
  isExtraImport,
  imports,
  text
) {
  // If no imports, find first non-comment line
  if (!imports.length) {
    return {
      match: getLastInitialComment(text, commentRegex),
      indexModifier: 1,
      isFirstImport: true
    };
  }

  // Imports exist, find correct sort order

  // First look for an exact match. This is done outside the main sorting loop because we don't care
  // where the exact match is located if it exists.
  const pathMatches = imports.filter(i => i.path === importPath);
  if (pathMatches.length) {
    return {
      match:
        (exportType === ExportType.type
          ? pathMatches.find(p => p.isTypeOutside)
          : pathMatches.find(p => !p.isTypeOutside)) || pathMatches[0],
      indexModifier: 0
    };
  }

  const importPos = getImportOrderPosition(importPath);
  const importIsAbsolute = !importPath.startsWith(".");

  for (const importData of imports) {
    // plugin.importOrder check
    const lineImportPos = getImportOrderPosition(importData.path);
    if (importPos != null && (!lineImportPos || importPos < lineImportPos)) {
      return { match: importData, indexModifier: -1 };
    } else if (lineImportPos != null) {
      continue;
    }

    // Node module check
    const lineIsNodeModule = isPathNodeModule(plugin, importData.path);

    if (isExtraImport && (!lineIsNodeModule || importPath < importData.path)) {
      return { match: importData, indexModifier: -1 };
    } else if (lineIsNodeModule) {
      continue;
    }

    // Absolute path check
    const lineIsAbsolute = !importData.path.startsWith(".");
    if (importIsAbsolute && (!lineIsAbsolute || importPath < importData.path)) {
      return { match: importData, indexModifier: -1 };
    } else if (lineIsAbsolute) {
      continue;
    }

    // Alphabetical
    if (importPath < importData.path)
      return { match: importData, indexModifier: -1 };
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
