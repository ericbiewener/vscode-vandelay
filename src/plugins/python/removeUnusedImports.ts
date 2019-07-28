import _ from 'lodash'
import { languages, TextDocument, window } from 'vscode'
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

  const { document } = editor
  if (!document.isDirty) {
    removeUnusedImportsOnDidChangeDiagnostics(plugin, document)
    return
  }

  // Must save document and wait for diagnostics to update since they don't update in real time for
  // Python.
  const disposable = languages.onDidChangeDiagnostics(() => {
    // Just in case we somehow get in here before the document finishes saving, bail out.
    if (document.isDirty) return
    removeUnusedImportsOnDidChangeDiagnostics(plugin, document)
  })

  setTimeout(() => disposable.dispose(), 5000)
  await document.save()
}

async function removeUnusedImportsOnDidChangeDiagnostics(plugin: PluginPy, document: TextDocument) {
  const editor = window.activeTextEditor
  if (!editor || editor.document !== document) return

  const diagnostics = getDiagnosticsForActiveEditor(d => d.code === 'F401')

  const fullText = document.getText()
  const fileImports = parseImports(fullText)
  const changes: Change[] = []
  const changesByMatch: Map<ParsedImportPy, Change> = new Map()

  for (const diagnostic of diagnostics) {
    const importMatch = findImportMatch(document, diagnostic, fileImports)
    if (!importMatch) continue

    // diagnostic.range only points to the start of the line, so we have to parse the import name
    // from diagnostic.message
    const lastDotPath = last(diagnostic.message.split('.'))
    const unusedImport = strUntil(lastDotPath, "'")

    const existingChange = changesByMatch.get(importMatch)
    const currentImports = existingChange ? existingChange.imports : importMatch.imports
    const imports = currentImports.filter(i => i !== unusedImport)

    if (existingChange) {
      existingChange.imports = imports
    } else {
      const newChange = { imports, match: importMatch }
      changesByMatch.set(newChange.match, newChange)
      changes.push(newChange)
    }
  }

  await removeUnusedImportChanges(plugin, editor, changes, getNewLineFromChange)
}

function getNewLineFromChange(plugin: PluginPy, change: Change) {
  const { imports, match } = change
  return imports.length ? getNewLine(plugin, match.path, imports) : ''
}
