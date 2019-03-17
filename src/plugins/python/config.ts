import { cacheFile } from "./cacher";
import { buildImportItems, insertImport } from "./importing/importer";
import { removeUnusedImports } from "./removeUnusedImports";
import { PluginConfigPy } from "./types";
import { Diagnostic } from "vscode";

function shouldIncludeDisgnostic({ code }: Diagnostic) {
  return code === "F821";
}

export const config: PluginConfigPy = {
  language: "py",
  cacheFile,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  shouldIncludeDisgnostic,
  multilineImportParentheses: true
};
