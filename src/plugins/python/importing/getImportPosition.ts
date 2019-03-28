import _ from "lodash";
import {
  getLastInitialComment,
  strUntil,
  getImportOrderPosition,
  last
} from "../../../utils";
import { commentRegex, ParsedImportPy } from "../regex";
import { isPathPackage } from "../utils";
import { PluginPy } from "../types";

/**
 * Determine which line number should get the import. This could be merged into that line
 * if they have the same path (resulting in lineIndexModifier = 0), or inserted as an entirely
 * new import line before or after (lineIndexModifier = -1 or 1)
 **/

export type ImportPositionMatch = {
  match: ParsedImportPy;
  indexModifier: -1 | 0 | 1;
  isFirstImport: false;
};
export type ImportPositionNoMatch = {
  match: { start: number; end: number } | null;
  indexModifier: 1;
  isFirstImport: true;
};
export type ImportPositionPy = ImportPositionMatch | ImportPositionNoMatch;

export function getImportPosition(
  plugin: PluginPy,
  importPath: string,
  isExtraImport: boolean | undefined,
  imports: ParsedImportPy[],
  text: string
): ImportPositionPy {
  // If no imports, find first non-comment line
  if (!imports.length) {
    return {
      match: getLastInitialComment(text, commentRegex),
      indexModifier: 1,
      isFirstImport: true
    };
  }

  // First look for an exact match. This is done outside the main sorting loop because we don't care
  // where the exact match is located if it exists.
  const exactMatch = imports.find(i => i.path === importPath);
  if (exactMatch) {
    return { match: exactMatch, indexModifier: 0, isFirstImport: false };
  }

  const importPos = getImportOrderPosition(plugin, strUntil(importPath, "."));
  const importIsAbsolute = !importPath.startsWith(".");

  for (const importData of imports) {
    // Package check
    const lineIsPackage = isPathPackage(plugin, importData.path);
    if (lineIsPackage && !isExtraImport) continue;

    const lineImportPos = getImportOrderPosition(
      plugin,
      strUntil(importData.path, ".")
    );

    // Both have import orders
    if (importPos != null && lineImportPos != null) {
      if (importPos > lineImportPos) continue;
      return {
        match: importData,
        indexModifier:
          importPos < lineImportPos || importPath < importData.path ? -1 : 1,
        isFirstImport: false
      };
    }

    // One is a package and the other isn't
    if (isExtraImport && !lineIsPackage) {
      return { match: importData, indexModifier: -1, isFirstImport: false };
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
        indexModifier: -1,
        isFirstImport: false
      };
    }

    if (isExtraImport && (!lineIsPackage || importPath < importData.path)) {
      return { match: importData, indexModifier: -1, isFirstImport: false };
    } else if (lineIsPackage) {
      continue;
    }

    // Absolute path comparison. This also handles the case where both paths are packages, causing
    // them to get compared alphabetically.
    const lineIsAbsolute = !importData.path.startsWith(".");
    if (importIsAbsolute && (!lineIsAbsolute || importPath < importData.path)) {
      return { match: importData, indexModifier: -1, isFirstImport: false };
    } else if (lineIsAbsolute) {
      continue;
    }
  }

  // Since we didn't find a line to sort the new import before, it will go after the last import
  return {
    match: last(imports),
    indexModifier: 1,
    isFirstImport: false
  };
}
