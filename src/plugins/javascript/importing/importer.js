const { window } = require("vscode");
const path = require("path");
const { parseImports } = require("../regex");
const { getImportPosition } = require("./getImportPosition");
const { ExportType } = require("./buildImportItems");
const { getNewLine } = require("./getNewLine");

function insertImport(plugin, importSelection) {
  const {
    label: exportName,
    description: importPath,
    absImportPath,
    exportType,
    isExtraImport
  } = importSelection;
  const editor = window.activeTextEditor;

  const finalImportPath = getFinalImportPath(
    plugin,
    importPath,
    absImportPath,
    isExtraImport
  );
  const fileText = editor.document.getText();
  const imports = parseImports(plugin, fileText);

  const importPosition = getImportPosition(
    plugin,
    exportType,
    finalImportPath,
    isExtraImport,
    imports,
    fileText
  );
  const lineImports = getNewLineImports(importPosition, exportName, exportType);
  if (!lineImports) return;
  const newLine = getNewLine(plugin, finalImportPath, lineImports);

  return plugin.utils.insertLine(newLine, importPosition);
}

function getFinalImportPath(plugin, importPath, absImportPath, isExtraImport) {
  if (isExtraImport) return importPath;

  const activeFilepath = window.activeTextEditor.document.fileName;
  importPath = getRelativeImportPath(activeFilepath, absImportPath);

  if (plugin.processImportPath) {
    const processedPath = plugin.processImportPath(
      importPath,
      absImportPath,
      activeFilepath,
      plugin.projectRoot
    );
    return plugin.utils.removeExt(processedPath || importPath);
  }

  return path.basename(importPath) === "index.js"
    ? path.dirname(importPath)
    : plugin.utils.removeExt(importPath);
}

function getNewLineImports(importPosition, exportName, exportType) {
  const { match, indexModifier } = importPosition;

  const imports = indexModifier
    ? { named: [], types: [] }
    : {
        named: match.named || [],
        types: match.types || [],
        default: match.default
      };

  if (exportType === ExportType.default) {
    if (imports.default) return;
    imports.default = exportName;
  } else {
    const arr = imports[exportType === ExportType.named ? "named" : "types"];
    if (arr.includes(exportName)) return;
    arr.push(exportName);
  }

  return imports;
}

function getRelativeImportPath(file, absImportPath) {
  const relativePath = path.relative(path.dirname(file), absImportPath);
  return relativePath[0] === "." ? relativePath : "." + path.sep + relativePath;
}

module.exports = {
  insertImport
};
