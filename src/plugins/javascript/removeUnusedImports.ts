import { window } from 'vscode'
import { findImportMatch, removeUnusedImportChanges } from '../../removeUnusedImports'
import { getDiagnosticsForActiveEditor } from '../../utils'
import { getNewLine } from './importing/getNewLine'
import { parseImports, ParsedImportJs } from './regex'
import { FileExportsJs, PluginJs } from './types'

type Change = {
  imports?: FileExportsJs
  match: ParsedImportJs
  fullLine?: boolean
}

function getRemainingImports(
  { default: defaultImport, named, types }: FileExportsJs | ParsedImportJs,
  unusedImport: string
): FileExportsJs {
  return {
    default: defaultImport !== unusedImport ? defaultImport : null,
    named: named ? named.filter((n) => n !== unusedImport) : [],
    types: types ? types.filter((n) => n !== unusedImport) : [],
  }
}

export async function removeUnusedImports(plugin: PluginJs) {
  const editor = window.activeTextEditor
  if (!editor) return

  const diagnostics = getDiagnosticsForActiveEditor((d) => {
    if (d.code === 'no-unused-vars') return true
    if (d.source !== 'ts') return false
    return d.code === 6133 || d.code === 6192
  })

  const { document } = editor
  const fullText = document.getText()
  const fileImports = parseImports(plugin, fullText)
  const changes: Change[] = []
  const changesByMatch: Map<ParsedImportJs, Change> = new Map()

  for (const diagnostic of diagnostics) {
    const importMatch = findImportMatch(document, diagnostic, fileImports)
    if (!importMatch) continue

    const unusedImport = document.getText(diagnostic.range)
    const fullLine = unusedImport.includes(' from ')
    if (fullLine) {
      // Don't need to add to `changesByMatch` since that is only needed to track non full-line matches
      changes.push({ match: importMatch, fullLine: true })
      continue
    }

    const existingChange = changesByMatch.get(importMatch)
    const currentImports = existingChange && existingChange.imports
    const imports = getRemainingImports(currentImports || importMatch, unusedImport)

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

function getNewLineFromChange(plugin: PluginJs, change: Change) {
  if (change.fullLine || !change.imports) return ''

  const { default: defaultImport, named, types } = change.imports
  return defaultImport || named.length || types.length
    ? getNewLine(plugin, change.match.path, change.imports)
    : ''
}
