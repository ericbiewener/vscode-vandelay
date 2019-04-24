import { window, Range, TextEditor } from 'vscode'
import path from 'path'
import {
  getTabChar,
  strUntil,
  getLastInitialComment,
  insertLine,
} from '../../../utils'
import { commentRegex, parseImports, ParsedImportPy } from '../regex'
import {
  getImportPosition,
  ImportPositionPy,
  ImportPositionMatch,
} from './getImportPosition'
import { PluginPy } from '../types'
import { RichQuickPickItem } from '../../../types'
import { getNewLine } from './getNewLine'

export async function insertImport(
  plugin: PluginPy,
  importSelection: RichQuickPickItem
) {
  const { label: exportName, isExtraImport } = importSelection
  const isPackageImport = !importSelection.description
  const importPath = importSelection.description || exportName
  const editor = window.activeTextEditor as TextEditor

  const fileText = editor.document.getText()
  const imports = parseImports(fileText)
  const importPosition = getImportPosition(
    plugin,
    importPath,
    isExtraImport,
    imports,
    fileText
  )

  // Make sure we aren't importing a full package when it already has a partial import, or vice versa
  if (!importPosition.indexModifier && !importPosition.isFirstImport) {
    // We have an exact line match for position
    if (isPackageImport) {
      if (importPosition.match.imports) {
        // partial imports exist
        window.showErrorMessage(
          "Can't import entire package when parts of the package are already being imported."
        )
      }
      return
    } else if (!importPosition.match.imports) {
      // partial imports don't exist
      window.showErrorMessage(
        "Can't import part of a package when the entire package is already being imported."
      )
      return
    }
  }

  const lineImports = getNewLineImports(importPosition, exportName)
  if (!lineImports) return

  let newLine: string
  if (isPackageImport) {
    newLine = `import ${exportName}`
  } else {
    // If we're adding to an existing line, re-use its path from `importPosition.match.path` in case it is a relative one
    const lineImportPath =
      importPosition.indexModifier || !importPosition.match.path
        ? importPath
        : importPosition.match.path
    newLine = getNewLine(plugin, lineImportPath, lineImports)
  }

  // Import groups
  // If indexModifier is 0, we're adding to a pre-existing line so no need to worry about groups

  const { indexModifier, isFirstImport } = importPosition
  if (indexModifier && !isFirstImport && plugin.importGroups) {
    const { before, after } = getSurroundingImportPaths(
      imports,
      importPosition as ImportPositionMatch
    )

    if (before || after) {
      const beforeGroup = before
        ? findImportPathGroup(plugin, before.path)
        : null
      const afterGroup = after ? findImportPathGroup(plugin, after.path) : null
      const newGroup = findImportPathGroup(plugin, importPath || exportName)

      if (before && newGroup != beforeGroup) newLine = '\n' + newLine
      if (after && newGroup != afterGroup) newLine += '\n'
      // Rewrite all 3 import lines
      const beforeLine = before
        ? `${fileText.slice(before.start, before.end)}\n`
        : ''
      const afterLine = after
        ? `\n${fileText.slice(after.start, after.end)}`
        : ''
      return editor.edit(builder => {
        const beforeMatch =
          before || getLastInitialComment(fileText, commentRegex)

        builder.replace(
          new Range(
            // If !before but beforeMatch exists, then beforeMatch is the comment match.
            // Use beforeMatch.end + 1 so that we don't overwrite the comment
            editor.document.positionAt(
              before ? beforeMatch.start : beforeMatch ? beforeMatch.end + 1 : 0
            ),
            editor.document.positionAt(after ? after.end : before.end)
          ),
          `${beforeLine}${newLine}${afterLine}`
        )
      })
    }
  }

  return insertLine(newLine, importPosition)
}

function findImportPathGroup(plugin: PluginPy, importPath: string) {
  if (!plugin.importGroups) return
  const importPathPrefix = strUntil(importPath, '.')

  for (const group of plugin.importGroups) {
    if (group.includes(importPathPrefix)) {
      return group
    }
  }
}

function getSurroundingImportPaths(
  imports: ParsedImportPy[],
  importPosition: ImportPositionMatch
) {
  const { match, indexModifier } = importPosition
  const matchIndex = imports.indexOf(match)
  const before = imports[matchIndex - (indexModifier > 0 ? 0 : 1)]
  const after = imports[matchIndex + (indexModifier > 0 ? 1 : 0)]

  // If a line break exists, then either before or after should be null depending on whether
  // the import is being inserted directly after `before` or directly before `after`
  return {
    before: before,
    after: after,
  }
}

function getNewLineImports(
  importPosition: ImportPositionPy,
  exportName: string
) {
  const { match, indexModifier, isFirstImport } = importPosition
  if (indexModifier || isFirstImport) return [exportName]

  const { imports, renamed } = match as ParsedImportPy
  if (!imports) return [exportName]
  if (imports.includes(exportName)) return

  if (!renamed) return [...imports, exportName]

  // Preserve the renaming of any existing imports
  const newImports = imports.map(name => {
    const renaming = renamed[name]
    return renaming ? `${name} as ${renaming}` : name
  })

  newImports.push(exportName)
  return newImports
}
