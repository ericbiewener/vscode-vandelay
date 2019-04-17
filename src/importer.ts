import _ from 'lodash'
import {
  Diagnostic,
  DiagnosticChangeEvent,
  languages,
  Range,
  TextDocument,
  TextEditor,
  window,
  workspace,
} from 'vscode'
import { getDiagnosticsForActiveEditor } from './utils'
import { getPluginForActiveFile } from './utils'
import { cacheFileManager } from './cacheFileManager'
import { MergedExportData } from './types'

// FIXME: all @ts-ignores

export async function selectImport(
  word?: string | undefined | null,
  autoInsertOnly?: boolean
) {
  const plugin = getPluginForActiveFile()
  if (!plugin) return

  return await cacheFileManager(plugin, async exportData => {
    if (!exportData) return
    // @ts-ignore
    const mergedData: MergedExportData = {
      ...exportData.imp,
      ...exportData.exp,
    }
    const sortedKeys = getExportDataKeysByCachedDate(mergedData)
    let items = plugin.buildImportItems(plugin, mergedData, sortedKeys)
    if (!items) return
    if (word) items = items.filter(item => item.label === word)

    let selection

    if (autoInsertOnly) {
      if (items.length > 1) return
      selection = items[0]
    } else {
      selection =
        !word ||
        items.length > 1 ||
        !workspace.getConfiguration('vandelay').autoSelectSingleImportResult
          ? await window.showQuickPick(items, { matchOnDescription: true })
          : items[0]
    }

    if (!selection) return
    return plugin.insertImport(plugin, selection)
  })
}

export async function selectImportForActiveWord() {
  const editor = window.activeTextEditor
  if (!editor) return

  const range = editor.document.getWordRangeAtPosition(editor.selection.active)
  const activeWord = range ? editor.document.getText(range) : null
  selectImport(activeWord)
}

export async function importUndefinedVariables() {
  const plugin = getPluginForActiveFile()
  if (!plugin) return

  const diagnostics = getDiagnosticsForActiveEditor(
    plugin.shouldIncludeDisgnostic
  )

  const { document } = window.activeTextEditor as TextEditor
  const words = getUndefinedWords(document, diagnostics)
  for (const word of words) await selectImport(word)
}

export async function onDidChangeDiagnostics(e: DiagnosticChangeEvent) {
  return Promise.all(
    e.uris.map(async uri => {
      const editor = window.activeTextEditor
      if (!editor || uri.path !== editor.document.uri.path) return

      const plugin = getPluginForActiveFile(true)
      if (!plugin) return

      const diagnostics = languages
        .getDiagnostics(uri)
        .filter(plugin.shouldIncludeDisgnostic)

      // Ignores editor.selections so that words actively being typed don't get auto-imported
      const words = getUndefinedWords(
        editor.document,
        diagnostics,
        editor.selections
      )
      for (const word of words) await selectImport(word, true)
    })
  )
}

function getUndefinedWords(
  document: TextDocument,
  diagnostics: Diagnostic[],
  ignoreRanges?: Range[]
) {
  const ignoreOffsets = !ignoreRanges
    ? null
    : ignoreRanges.map(range => ({
        start: document.offsetAt(range.start),
        end: document.offsetAt(range.start),
      }))

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
      if (ignoreOffsets) {
        for (const { start, end } of ignoreOffsets) {
          if (
            start >= document.offsetAt(range.end) ||
            end <= document.offsetAt(range.start)
          ) {
            return null
          }
        }
      }

      return document.getText(range)
    })
    .filter(Boolean)

  return _.uniq(words)
}

function getExportDataKeysByCachedDate(exportData: MergedExportData) {
  return Object.keys(exportData).sort((a, b) => {
    const createdA = exportData[a].cached
    const createdB = exportData[b].cached
    if (!createdA && !createdB) return a < b ? -1 : 1 // alphabetical
    if (createdA && !createdB) return -1
    if (createdB && !createdA) return 1
    // @ts-ignore
    return createdA < createdB ? 1 : -1
  })
}
