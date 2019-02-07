const { removeUnusedImports } = require("../../removeUnusedImports");
const { cacheFile, processCachedData } = require("./cacher");
const { buildImportItems } = require("./importing/buildImportItems");
const { insertImport } = require("./importing/importer");

function shouldIncludeDisgnostic({ code, source, message }) {
  return (
    ["no-undef", "react/jsx-no-undef"].includes(code) ||
    (source === "flow" && message.startsWith("Cannot resolve name"))
  );
}

// TODO: name space settings vs utils?
const config = {
  language: "js",
  cacheFile,
  processCachedData,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  useSingleQuotes: true,
  padCurlyBraces: true,
  useSemicolons: true,
  trailingComma: true,
  multilineImportStyle: "multi",
  shouldIncludeDisgnostic,
  context,
  newVersionAlert: {
    name: "Vandelay JS",
    changelogUrl:
      "https://github.com/ericbiewener/vscode-vandelay-js/blob/master/CHANGELOG.md",
    extensionIdentifier: "edb.vandelay-js",
    suppressAlert: true
  },
  excludePatterns: [/.*\/node_modules(\/.*)?/]
};

module.exports = { config };
