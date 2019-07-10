import _ from 'lodash'
import { Uri, window } from 'vscode'
import { getDiagnosticsForAllEditors, removeUnusedImportChanges } from '../../utils'
import { getNewLine } from './importing/getNewLine'
import { parseImports, ParsedImportJs } from './regex'
import { PluginJs } from './types'

type Change =
  | {
      default: string | null | undefined
      named: string[]
      types: string[]
      match: ParsedImportJs
      entireLine: false
    }
  | { entireLine: true; match: ParsedImportJs }

export async function removeUnusedImports(plugin: PluginJs) {
  const diagnostics = getDiagnosticsForAllEditors(d => {
    if (d.code === 'no-unused-vars') return true
    if (d.source !== 'ts') return false
    return d.code === 6133 || d.code === 6192
  })

  for (const filepath in diagnostics) {
    const editor = await window.showTextDocument(Uri.file(filepath), {
      preserveFocus: true,
      preview: false,
    })
    const { document } = editor
    const fullText = document.getText()
    const fileImports = parseImports(plugin, fullText)
    const changes: Change[] = []
    const changesByPath: { [path: string]: Change | undefined } = {}

    for (const diagnostic of diagnostics[filepath]) {
      const offset = document.offsetAt(diagnostic.range.start)
      const importMatch = fileImports.find(i => i.start <= offset && i.end >= offset)
      if (!importMatch) continue

      const existingChange = changesByPath[importMatch.path]
      if (existingChange && existingChange.entireLine) continue // Not actually possible, but needed to appease TS

      const { default: defaultImport, named, types } = existingChange || importMatch
      const unusedImport = document.getText(diagnostic.range)
      const entireLine = unusedImport.includes(' from ')

      const change: Change = entireLine
        ? { entireLine: true, match: importMatch }
        : {
            default: defaultImport !== unusedImport ? defaultImport : null,
            named: named ? named.filter(n => n !== unusedImport) : [],
            types: types ? types.filter(n => n !== unusedImport) : [],
            match: importMatch,
            entireLine: false,
          }
      changesByPath[importMatch.path] = change
      changes.push(change)
    }

    await removeUnusedImportChanges(plugin, editor, changes, getNewLineFromChange)
  }
}

function getNewLineFromChange(plugin: PluginJs, change: Change) {
  if (change.entireLine) return ''

  const { default: defaultImport, named, types, match } = change
  return defaultImport || named.length || types.length ? getNewLine(plugin, match.path, change) : ''
}
