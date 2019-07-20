import { TextEditor, window } from 'vscode'
import { getUndefinedWords, selectImport } from './importer'
import { removeUnusedImports } from './removeUnusedImports'
import { getDiagnosticsForActiveEditor, getPluginForActiveFile } from './utils'

// FIXME: currently this is exactly the same as the normali `importUndefinedVariables` except that
// it passeses silent=true to getPluginForActiveFile as well as the ignoreRanges to
// getUndefinedWords.
export async function importUndefinedVariablesButIgnoreEditorSelectionRanges() {
  const plugin = getPluginForActiveFile(true)
  if (!plugin) return

  const diagnostics = getDiagnosticsForActiveEditor(plugin.shouldIncludeDisgnostic)
  if (!diagnostics.length) return

  const editor = window.activeTextEditor as TextEditor
  const words = getUndefinedWords(editor.document, diagnostics, editor.selections)
  for (const word of words) await selectImport(word)
}

export async function onDidChangeDiagnostics() {
  await importUndefinedVariablesButIgnoreEditorSelectionRanges()
  await removeUnusedImports()
}

export function registerCompletionItemProvider() {}
