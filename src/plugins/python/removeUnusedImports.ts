import _ from 'lodash'
import { Uri, window } from 'vscode'
import { getDiagnosticsForAllEditors, last, removeUnusedImportChanges, strUntil } from '../../utils'
import { parseImports, ParsedImportPy } from './regex'
import { PluginPy } from './types'
import { getNewLine } from './importing/getNewLine'

interface Change {
  imports: string[]
  match: ParsedImportPy
}

export async function removeUnusedImports(plugin: PluginPy) {
  const diagnostics = getDiagnosticsForAllEditors(d => d.code === 'F401')

  for (const filepath in diagnostics) {
    const editor = await window.showTextDocument(Uri.file(filepath), {
      preserveFocus: true,
      preview: false,
    })
    const { document } = editor
    const fullText = document.getText()
    const fileImports = parseImports(fullText)
    const changes: Change[] = []
    const changesByPath: { [path: string]: Change } = {}

    for (const diagnostic of diagnostics[filepath]) {
      const offset = document.offsetAt(diagnostic.range.start)
      const importMatch = fileImports.find(i => i.start <= offset && i.end >= offset)
      if (!importMatch) return

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
}

function getNewLineFromChange(plugin: PluginPy, change: Change) {
  const { imports, match } = change
  return imports.length ? getNewLine(plugin, match.path, imports) : ''
}
