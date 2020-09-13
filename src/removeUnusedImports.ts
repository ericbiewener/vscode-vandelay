import { Diagnostic, Range, TextDocument, TextEditor, window } from 'vscode'

import { getPluginForActiveFile } from './utils'

export async function removeUnusedImports() {
  const plugin = getPluginForActiveFile()
  if (!plugin) return

  const originalEditor = window.activeTextEditor as TextEditor
  await plugin.removeUnusedImports(plugin)
  await window.showTextDocument(originalEditor.document.uri)
}

export function findImportMatch<P extends { start: number; end: number }>(
  document: TextDocument,
  diagnostic: Diagnostic,
  fileImports: P[]
) {
  const offset = document.offsetAt(diagnostic.range.start)
  return fileImports.find((i) => i.start <= offset && i.end >= offset)
}

export async function removeUnusedImportChanges<C extends Change, P>(
  plugin: P,
  editor: TextEditor,
  changes: C[],
  getNewLineFromChange: (plugin: P, change: C) => string
) {
  if (!changes.length) return
  sortUnusedImportChanges(changes)

  const { document } = editor
  const fullText = document.getText()
  const oldTextEnd = changes[0].match.end
  let newText = fullText.slice(0, oldTextEnd)
  let isFinalLineBlank: boolean | null = null

  for (const change of changes) {
    const newLine = getNewLineFromChange(plugin, change)
    // Will only get set on the first loop iteration, which is the desired behavior because the
    // changes are sorted by latest-line first.
    if (isFinalLineBlank === null) isFinalLineBlank = !newLine

    const { match } = change
    let { end } = match
    if (!newLine) end += newText[end + 1] === '\n' ? 2 : 1
    newText = newText.slice(0, match.start) + newLine + newText.slice(end)
  }

  await editor.edit((builder) => {
    const endOffsetModifier = isFinalLineBlank && fullText[oldTextEnd] === '\n' ? 1 : 0
    builder.replace(
      new Range(document.positionAt(0), document.positionAt(oldTextEnd + endOffsetModifier)),
      newText
    )
  })

  await document.save()
}

/**
 * Sort in reverse order so that modifying a line doesn't effect the other line locations that need to be changed
 */
type Change = {
  match: { start: number; end: number }
}

export function sortUnusedImportChanges(changes: Change[]) {
  changes.sort((a, b) => (a.match.start < b.match.start ? 1 : -1))
}
