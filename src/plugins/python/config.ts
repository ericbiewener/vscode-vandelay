import { cacheFile, processCachedData } from "./cacher"
import { buildImportItems, insertImport } from "./importing/importer"
import { removeUnusedImports } from "./removeUnusedImports"

function shouldIncludeDisgnostic({ code }) {
  return code === "F821";
}

export const config = {
  language: "py",
  cacheFile,
  processCachedData,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  shouldIncludeDisgnostic,
  multilineImportParentheses: true
};
