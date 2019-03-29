import _ from 'lodash'
import { Range, Uri, window } from 'vscode'
import {
  strUntil,
  getDiagnosticsForAllEditors,
  sortUnusedImportChanges,
  last,
} from '../../utils'
import { importRegex, parseImports, ParsedImportPy } from './regex'
import { PluginPy } from './types'
import { getNewLine } from './importing/getNewLine'

interface Change {
  imports: string[]
  match: ParsedImportPy
}

export async function removeUnusedImports(plugin: PluginPy) {
  const diagnostics = getDiagnosticsForAllEditors(
    d => d.code === 'no-unused-vars'
  )

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
      const importMatch = fileImports.find(
        i => i.start <= offset && i.end >= offset
      )
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

    sortUnusedImportChanges(changes)

    // We make changes to a string outside of the edit builder so that we don't have to worry about
    // overlapping edit ranges
    const oldTextEnd = changes[0].match.end + 1 // +1 in case we need to remove the following \n
    let newText = fullText.slice(0, oldTextEnd) // could just do this on the fullText

    for (const change of changes) {
      const { imports, match } = change
      const newLine = imports.length
        ? getNewLine(plugin, match.path, imports)
        : ''

      let { end } = match
      if (!newLine) end += newText[end + 1] === '\n' ? 2 : 1
      newText = newText.slice(0, match.start) + newLine + newText.slice(end)
    }

    await editor.edit(builder => {
      builder.replace(
        new Range(document.positionAt(0), document.positionAt(oldTextEnd)),
        newText
      )
    })

    await document.save()
  }
}
