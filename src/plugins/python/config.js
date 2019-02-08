const { cacheFile, processCachedData } = require("./cacher");
const { buildImportItems, insertImport } = require("./importing/importer");
const { removeUnusedImports } = require("./removeUnusedImports");

function shouldIncludeDisgnostic({ code }) {
  return code === "F821";
}

const config = {
  language: "py",
  cacheFile,
  processCachedData,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  shouldIncludeDisgnostic,
  multilineImportParentheses: true
};

module.exports = { config };
