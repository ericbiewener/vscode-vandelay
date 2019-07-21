import _ from 'lodash'
import { window } from 'vscode'
import { findImportMatch, removeUnusedImportChanges } from '../../removeUnusedImports'
import { getDiagnosticsForActiveEditor, last, strUntil } from '../../utils'
import { parseImports, ParsedImportPy } from './regex'
import { PluginPy } from './types'
import { getNewLine } from './importing/getNewLine'

type Change = {
  imports: string[]
  match: ParsedImportPy
}

export async function removeUnusedImports(plugin: PluginPy) {
  const editor = window.activeTextEditor
  if (!editor) return

  const diagnostics = getDiagnosticsForActiveEditor(d => d.code === 'F401')

  const { document } = editor
  const fullText = document.getText()
  const fileImports = parseImports(fullText)
  const changes: Change[] = []
  const changesByPath: { [path: string]: Change } = {}

  for (const diagnostic of diagnostics) {
    const importMatch = findImportMatch(document, diagnostic, fileImports)
    if (!importMatch) continue

    const { imports } = changesByPath[importMatch.path] || importMatch
    // diagnostic.range only points to the start of the line, so we have to parse the import name
    // from diagnostic.message
    const lastDotPath = last(diagnostic.message.split('.'))
    const unusedImport = strUntil(lastDotPath, "'")

    const change = {
      imports: imports ? imports.filter(n => n !== unusedImport) : [],
      match: importMatch,
    }
    changesByPath[importMatch.path] = change
    changes.push(change)
  }

  await removeUnusedImportChanges(plugin, editor, changes, getNewLineFromChange)
}

function getNewLineFromChange(plugin: PluginPy, change: Change) {
  const { imports, match } = change
  return imports.length ? getNewLine(plugin, match.path, imports) : ''
}
