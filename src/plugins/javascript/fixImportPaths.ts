import vsc from 'vscode'
import { cacheFileManager } from '../../cacheFileManager'
import { getItemsForText, selectImport } from '../../importer'
import { PLUGINS } from '../../plugins'
import { RichQuickPickItem } from '../../types'
import { ParsedImportJs, parseImports } from './regex'
import { PluginJs } from './types'

const getFixedImports = async (plugin: PluginJs, badImports: string[]) => {
  const newImports: RichQuickPickItem[] = []

  await cacheFileManager(plugin, async (exportData) => {
    for (const name of badImports) {
      if (!name) continue
      const items = getItemsForText(plugin, exportData, name)
      if (items && items.length === 1) newImports.push(items[0])
    }
  })

  return newImports
}

export const fixAllImportPaths = async () => {
  const plugin = PLUGINS.js as PluginJs
  if (!plugin) return

  for (const [uri, diagnostics] of vsc.languages.getDiagnostics()) {
    const badDiagnostics = diagnostics.filter((d) => d.source === 'ts' && d.code === 2307)
    if (!badDiagnostics.length) continue

    const editor = await vsc.window.showTextDocument(uri)
    const { document } = editor
    const imports = parseImports(plugin, document.getText())
    imports.reverse() // Process from last import to first so that the ranges remain valid

    // Gather all imports to re-add. Must process all deletions to maintain stable ranges before
    // re-adding.
    const importsToAdd: string[] = []
    const importsToDelete: ParsedImportJs[] = []

    for (const diagnostic of badDiagnostics) {
      const text = document.getText(diagnostic.range).replace(/['"]/g, '')
      const badImport = imports.find((imp) => imp.path === text)
      if (!badImport) continue

      const badImportNames = [...badImport.named, badImport.default].filter(Boolean) as string[]
      const newImports = await getFixedImports(plugin, badImportNames)
      // Make sure we have found replacements for all the imports before deleting
      if (newImports.length !== badImportNames.length) continue

      importsToDelete.push(badImport)
      importsToAdd.push(...badImportNames)
    }

    await editor.edit((builder) => {
      for (const badImport of importsToDelete) {
        builder.delete(
          new vsc.Range(
            document.positionAt(badImport.start),
            document.positionAt(badImport.end + 1), // +1 for new line
          ),
        )
      }
    })

    for (const imp of importsToAdd) {
      await selectImport(imp)
    }
  }
}
