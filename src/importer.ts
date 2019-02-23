import _ from "lodash"
import { window, workspace, TextEditor } from "vscode"
import { getDiagnostics, getExportDataKeysByCachedDate } from "./utils"
import { getPluginForActiveFile } from "./utils"
import { cacheFileManager } from "./cacheFileManager"
import { MergedExportData } from "./types";

export async function selectImport(word?: string | undefined | null) {
  const plugin = getPluginForActiveFile();
  if (!plugin) return;

  return await cacheFileManager(plugin, async exportData => {
    if (!exportData) return
    const mergedData: MergedExportData = { ...exportData.imp, ...exportData.exp }
    const sortedKeys = getExportDataKeysByCachedDate(mergedData);
    let items = plugin.buildImportItems(plugin, exportData, sortedKeys);
    if (!items) return;
    if (word) items = items.filter(item => item.label === word);

    const selection =
      !word ||
      items.length > 1 ||
      !workspace.getConfiguration("vandelay").autoImportSingleResult
        ? await window.showQuickPick(items, { matchOnDescription: true })
        : items[0];

    if (!selection) return;
    return plugin.insertImport(plugin, selection);
  });
}

export async function selectImportForActiveWord() {
  const editor = window.activeTextEditor;
  if (!editor) return;

  const range = editor.document.getWordRangeAtPosition(editor.selection.active);
  const activeWord = range ? editor.document.getText(range) : null;
  selectImport(activeWord);
}

export async function importUndefinedVariables() {
  const filter = _.get(getPluginForActiveFile(), "shouldIncludeDisgnostic");
  if (!filter) return [];

  const diagnostics = getDiagnostics(filter, true);
  if (!diagnostics.length) return;

  const { document } = window.activeTextEditor as TextEditor;
  // Must collect all words before inserting any because insertions will cause the diagnostic ranges
  // to no longer be correct, thus not allowing us to get subsequent words
  const words = []
  for (const d of diagnostics) {
    // Flake8 is returning a collapsed range, so expand it to the entire word
    const range = _.isEqual(d.range.start, d.range.end)
      ? document.getWordRangeAtPosition(d.range.start)
      : d.range;
    words.push(document.getText(range));
  }

  for (const word of _.uniq(words)) await selectImport(word);
}

