import fs from "fs"
import makeDir from "make-dir"
import path from "path"
import _ from "lodash"
import { languages, Position, Range, window } from "vscode"
import { JS_EXTENSIONS } from './plugins/javascript/config'
import { Obj } from './types'

const extensionToLang: Obj = {}
for (const ext of JS_EXTENSIONS) extensionToLang[ext] = 'js'

export function writeCacheFile(plugin, data) {
  _.each(data._extraImports, d => (d.isExtraImport = true));
  return makeDir(plugin.cacheDirPath).then(() =>
    fs.writeFileSync(plugin.cacheFilePath, JSON.stringify(data))
  );
}

export function isFile(file: string) {
  try {
    return fs.statSync(file).isFile();
  } catch (e) {
    if (e.code !== "ENOENT") throw e; // File might exist, but something else went wrong (e.g. permissions error)
    return false;
  }
}

export function getLangFromFilePath(filePath: string) {
  const ext = path.extname(filePath).slice(1);
  return extensionToLang[ext] || ext;
}

export function getPluginForActiveFile() {
  if (!window.activeTextEditor) return;
  const { PLUGINS } = require("./plugins");
  const plugin =
    PLUGINS[getLangFromFilePath(window.activeTextEditor.document.fileName)];
  if (!plugin)
    window.showErrorMessage("Vandelay doesn't support the current language.");
  return plugin;
}

export function getFilepathKey(plugin, filepath) {
  return filepath.slice(plugin.projectRoot.length + 1);
}

// Extracted for sharing with plugins for testing
export function getImportItems(plugin, exportData, buildImportItems) {
  Object.assign(exportData, exportData._extraImports);
  delete exportData._extraImports;
  if (exportData)
    return (buildImportItems || plugin.buildImportItems)(plugin, exportData);
}

// TODO: rename `basenameNoExt`
export function basename(filepath) {
  return path.basename(filepath, path.extname(filepath));
}

export async function insertLine(newLine, importPosition) {
  const { match, indexModifier, isFirstImport } = importPosition;
  const editor = window.activeTextEditor;
  const { document } = editor;

  // If this is the first import and the line after where we're inserting it has content, add an extra line break
  if (
    isFirstImport &&
    document.lineAt(document.positionAt(match ? match.end + 1 : 0)).text
  ) {
    newLine += "\n";
  }

  return await editor.edit(builder => {
    if (!match) {
      builder.insert(new Position(0, 0), newLine + "\n");
    } else if (!indexModifier) {
      builder.replace(
        new Range(
          document.positionAt(match.start),
          document.positionAt(match.end)
        ),
        newLine
      );
    } else if (indexModifier === 1) {
      builder.insert(document.positionAt(match.end), "\n" + newLine);
    } else {
      // -1
      builder.insert(document.positionAt(match.start), newLine + "\n");
    }
  });
}

export function getTabChar() {
  const { options } = window.activeTextEditor;
  return options.insertSpaces ? _.repeat(" ", options.tabSize) : "\t";
}

export function strUntil(str, endChar) {
  const index =
    typeof endChar === "string" ? str.indexOf(endChar) : str.search(endChar);
  return index < 0 ? str : str.slice(0, index);
}

export function removeExt(filepath) {
  const ext = path.extname(filepath);
  return ext ? filepath.slice(0, -ext.length) : filepath;
}

export function getLastInitialComment(text, commentRegex) {
  // Iterates over comment line matches. If one doesn't begin where the previous one left off, this means
  // a non comment line came between them.
  let expectedNextIndex = 0;
  let match;
  let lastMatch;
  while ((match = commentRegex.exec(text))) {
    if (match.index !== expectedNextIndex) break;
    expectedNextIndex = commentRegex.lastIndex + 1;
    lastMatch = match;
  }

  return lastMatch
    ? {
        start: lastMatch.index,
        end: lastMatch.index + lastMatch[0].length
      }
    : null;
}

export function getImportOrderPosition(plugin, importPath) {
  if (!plugin.importGroups) return;
  const index = _.flatten(plugin.importGroups).indexOf(importPath);
  return index > -1 ? index : undefined;
}

export function getExportDataKeysByCachedDate(exportData) {
  return Object.keys(exportData).sort((a, b) => {
    const createdA = exportData[a].cached;
    const createdB = exportData[b].cached;
    if (!createdA && !createdB) return a < b ? -1 : 1; // alphabetical
    if (createdA && !createdB) return -1;
    if (createdB && !createdA) return 1;
    return createdA < createdB ? 1 : -1;
  });
}

export function getDiagnostics(filter, forActiveEditor) {
  if (forActiveEditor) {
    return languages
      .getDiagnostics(window.activeTextEditor.document.uri)
      .filter(filter);
  }

  const diagnosticsByFile = {};
  for (const [file, diagnostics] of languages.getDiagnostics()) {
    const remaining = diagnostics.filter(filter);
    if (remaining.length) diagnosticsByFile[file.fsPath] = remaining;
  }
  return diagnosticsByFile;
}
