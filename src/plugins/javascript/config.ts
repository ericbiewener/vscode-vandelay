import { removeUnusedImports } from "./removeUnusedImports"
import { cacheFile, processCachedData } from "./cacher"
import { buildImportItems } from "./importing/buildImportItems"
import { insertImport } from "./importing/importer"

function shouldIncludeDisgnostic({ code, source, message }) {
  return (
    ["no-undef", "react/jsx-no-undef"].includes(code) ||
    (source === "flow" && message.startsWith("Cannot resolve name"))
  );
}

// TODO: namespace settings vs utils?
export const config = {
  language: "js",
  cacheFile,
  processCachedData,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  shouldIncludeDisgnostic,
  useSingleQuotes: true,
  padCurlyBraces: true,
  useSemicolons: true,
  trailingComma: true,
  multilineImportStyle: "multi",
  excludePatterns: [/.*\/node_modules(\/.*)?/]
};
