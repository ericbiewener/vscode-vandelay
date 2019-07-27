import _ from 'lodash'
import { Diagnostic, Range, Selection, TextEditor, window, workspace, TextDocument } from 'vscode'
import { getDiagnosticsForActiveEditor, getWordAtPosition } from './utils'
import { getPluginForActiveFile } from './utils'
import { cacheFileManager } from './cacheFileManager'
import { MergedExportData, RichQuickPickItem } from './types'

export async function selectImport(word?: string | undefined | null, alsoInsertAtCursor?: boolean) {
  const plugin = getPluginForActiveFile()
  if (!plugin) return

  return await cacheFileManager(plugin, async exportData => {
    if (!exportData) return

    const mergedData = plugin.mergeExportData(exportData)
    const sortedKeys = getExportDataKeysByCachedDate(mergedData)
    let items = plugin.buildImportItems(plugin as any, mergedData, sortedKeys)
    if (!items) return
    if (word) items = items.filter((item: RichQuickPickItem) => item.label === word)

    const item =
      !word || items.length > 1 || !workspace.getConfiguration('vandelay').autoImportSingleResult
        ? await window.showQuickPick(items, { matchOnDescription: true })
        : items[0]

    if (!item) return
    await plugin.insertImport(plugin, item)
    if (alsoInsertAtCursor) await insertImportAtCursor(item)
  })
}

async function insertImportAtCursor(item: RichQuickPickItem) {
  const editor = window.activeTextEditor
  if (!editor) return

  await editor.edit(builder => {
    const { selection } = editor
    builder.replace(new Range(selection.start, selection.end), item.label)
  })

  editor.selection = new Selection(editor.selection.end, editor.selection.end)
}

export async function selectImportForActiveWord() {
  const editor = window.activeTextEditor
  if (!editor) return
  selectImport(getWordAtPosition(editor.document, editor.selection.active))
}

export async function importUndefinedVariables() {
  const plugin = getPluginForActiveFile()
  if (!plugin) return

  const diagnostics = getDiagnosticsForActiveEditor(plugin.shouldIncludeDisgnostic)
  if (!diagnostics.length) return

  const { document } = window.activeTextEditor as TextEditor
  const words = getUndefinedWords(document, diagnostics)
  for (const word of words) await selectImport(word)
}

function getExportDataKeysByCachedDate(exportData: MergedExportData) {
  return Object.keys(exportData).sort((a, b) => {
    const createdA = exportData[a].cached
    const createdB = exportData[b].cached
    if (!createdA && !createdB) return a < b ? -1 : 1 // alphabetical
    if (createdA && !createdB) return -1
    if (createdB && !createdA) return 1
    if (createdA === createdB) return 0
    // @ts-ignore
    return createdA < createdB ? 1 : -1
  })
}

export function getUndefinedWords(
  document: TextDocument,
  diagnostics: Diagnostic[],
  ignoreRanges: Range[] = []
) {
  // Must collect all words before inserting any because insertions will cause the diagnostic ranges
  // to no longer be correct, thus not allowing us to get subsequent words
  const words = diagnostics
    .map(d => {
      // Flake8 is returning a collapsed range, so expand it to the entire word
      const range = _.isEqual(d.range.start, d.range.end)
        ? document.getWordRangeAtPosition(d.range.start)
        : d.range

      if (!range) return null

      // Don't import word if range overlaps at all
      for (const ignoreRange of ignoreRanges) {
        if (ignoreRange.intersection(range)) return null
      }

      return document.getText(range)
    })
    .filter(Boolean)

  return _.uniq(words)
}
