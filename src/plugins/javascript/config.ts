import { removeUnusedImports } from "./removeUnusedImports";
import { cacheFile, processCachedData } from "./cacher";
import { buildImportItems } from "./importing/buildImportItems";
import { insertImport } from "./importing/importer";
import { Diagnostic } from "vscode";
import { PluginConfigJs } from "./types";

type DiagnosticCode = string | number | undefined;

function shouldIncludeDisgnostic({ code, source, message }: Diagnostic) {
  const codes: DiagnosticCode[] = ["no-undef", "react/jsx-no-undef"];
  return (
    codes.includes(code) ||
    (source === "flow" && message.startsWith("Cannot resolve name"))
  );
}

export const JS_EXTENSIONS = ["js", "jsx", "ts", "tsx", "mjs"];

export const config: PluginConfigJs = {
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
  multilineImportStyle: "multiple",
  excludePatterns: [/.*\/node_modules(\/.*)?/]
};
