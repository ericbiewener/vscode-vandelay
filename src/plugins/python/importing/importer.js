const { window, Range } = require("vscode");
const path = require("path");
const { getTabChar, strUntil } = require("../../../utils");
const { commentRegex, parseImports } = require("../regex");
const { getImportPosition } = require("./getImportPosition");

function buildImportItems(plugin, exportData) {
  const { projectRoot, shouldIncludeImport } = plugin;
  const activeFilepath = window.activeTextEditor.document.fileName;
  const items = [];

  const sortedKeys = getExportDataKeysByCachedDate(exportData);
  for (const importPath of sortedKeys) {
    const data = exportData[importPath];
    const absImportPath = data.isExtraImport
      ? importPath
      : path.join(projectRoot, importPath);
    if (absImportPath === activeFilepath) continue;
    if (
      shouldIncludeImport &&
      !shouldIncludeImport(absImportPath, activeFilepath)
    ) {
      continue;
    }

    let dotPath;
    if (data.isExtraImport) {
      dotPath = importPath;
    } else {
      dotPath = removeExt(importPath).replace(/\//g, ".");
      if (plugin.processImportPath) dotPath = plugin.processImportPath(dotPath);
    }

    if (data.importEntirePackage) {
      items.push({
        label: importPath,
        isExtraImport: data.isExtraImport
      });
    }

    if (!data.exports) continue;

    for (const exportName of data.exports) {
      items.push({
        label: exportName,
        description: dotPath,
        isExtraImport: data.isExtraImport
      });
    }
  }

  return items;
}

function insertImport(plugin, importSelection) {
  const { label: exportName, isExtraImport } = importSelection;
  const isPackageImport = !importSelection.description;
  const importPath = importSelection.description || exportName;
  const editor = window.activeTextEditor;

  const fileText = editor.document.getText();
  const imports = parseImports(fileText);
  const importPosition = getImportPosition(
    plugin,
    importPath,
    isExtraImport,
    imports,
    fileText
  );

  // Make sure we aren't importing a full package when it already has a partial import, or vice versa
  if (!importPosition.indexModifier && !importPosition.isFirstImport) {
    if (isPackageImport) {
      if (importPosition.match.imports) {
        // partial imports exist
        window.showErrorMessage(
          "Can't import entire package when parts of the package are already being imported."
        );
      }
      return;
    } else if (!importPosition.match.imports) {
      // partial imports don't exist
      window.showErrorMessage(
        "Can't import part of a package when the entire package is already being imported."
      );
      return;
    }
  }

  const lineImports = getNewLineImports(importPosition, exportName);
  if (!lineImports) return;
  let newLine = isPackageImport
    ? `import ${exportName}`
    : getNewLine(plugin, importPath, lineImports);

  // Import groups

  const { indexModifier } = importPosition;
  // If indexModifier is 0, we're adding to a pre-existing line so no need to worry about groups
  if (indexModifier && plugin.importGroups) {
    const { before, after } = getSurroundingImportPaths(
      plugin,
      imports,
      importPosition
    );

    if (before || after) {
      const beforeGroup = before
        ? findImportPathGroup(plugin, before.path)
        : null;
      const afterGroup = after ? findImportPathGroup(plugin, after.path) : null;
      const newGroup = findImportPathGroup(plugin, importPath || exportName);

      if (before && newGroup != beforeGroup) newLine = "\n" + newLine;
      if (after && newGroup != afterGroup) newLine += "\n";
      // Rewrite all 3 import lines
      const beforeLine = before
        ? `${fileText.slice(before.start, before.end)}\n`
        : "";
      const afterLine = after
        ? `\n${fileText.slice(after.start, after.end)}`
        : "";
      return editor.edit(builder => {
        const beforeMatch =
          before || getLastInitialComment(fileText, commentRegex);

        builder.replace(
          new Range(
            // If !before but beforeMatch exists, then beforeMatch is the comment match.
            // Use beforeMatch.end + 1 so that we don't overwrite the comment
            editor.document.positionAt(
              before ? beforeMatch.start : beforeMatch ? beforeMatch.end + 1 : 0
            ),
            editor.document.positionAt(after ? after.end : before.end)
          ),
          `${beforeLine}${newLine}${afterLine}`
        );
      });
    }
  }

  return insertLine(newLine, importPosition);
}

function findImportPathGroup(plugin, importPath) {
  const importPathPrefix = strUntil(importPath, ".");

  for (const group of plugin.importGroups) {
    if (group.includes(importPathPrefix)) {
      return group;
    }
  }
}

function getSurroundingImportPaths(plugin, imports, importPosition) {
  const { match, indexModifier } = importPosition;
  const matchIndex = imports.indexOf(match);
  const before = imports[matchIndex - (indexModifier > 0 ? 0 : 1)];
  const after = imports[matchIndex + (indexModifier > 0 ? 1 : 0)];

  // If a line break exists, then either before or after should be null depending on whether
  // the import is being inserted directly after `before` or directly before `after`
  return {
    before: before,
    after: after
  };
}

function getNewLineImports(importPosition, exportName) {
  const { match, indexModifier } = importPosition;

  if (indexModifier) return [exportName];
  if (match.imports.includes(exportName)) return;
  return [...match.imports, exportName];
}

function getNewLine(plugin, importPath, imports) {
  const { maxImportLineLength } = plugin;

  const sensitivity = { sensitivity: "base" };
  imports.sort((a, b) => a.localeCompare(b, undefined, sensitivity));

  const newLineStart = "from " + importPath + " import ";
  const newLineEnd = imports.join(", ");

  const tabChar = getTabChar();
  const newLineLength = newLineStart.length + newLineEnd.length;

  if (newLineLength <= maxImportLineLength) {
    return newLineStart + newLineEnd;
  }

  let line = newLineStart + "(";
  let fullText = "";

  imports.forEach((name, i) => {
    const isLast = i === imports.length - 1;

    let newText = (i > 0 ? " " : "") + name;
    if (!isLast) newText += ",";

    let newLength = line.length + newText.length;
    if (isLast) newLength++; // for closing parenthesis

    if (newLength < maxImportLineLength) {
      line += newText;
    } else {
      fullText += line + "\n";
      line = tabChar + newText.trim();
    }

    if (isLast) fullText += line;
  });

  return fullText + ")";
}

module.exports = {
  buildImportItems,
  insertImport,
  getNewLine
};
