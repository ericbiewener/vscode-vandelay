// FIXME: notify user that they should turn off auto-import JS & TS if it is on now that Vandelay supports this
import { CompletionItem, CompletionItemKind, Position, TextDocument, TextEdit } from 'vscode'
import { cacheFileManager } from '../../cacheFileManager'
import { MergedExportData } from '../../types'
import { getPluginForActiveFile } from '../../utils'
import { insertImport } from './importing/importer'
import { PluginJs } from './types'

async function provideCompletionItems(
  document: TextDocument,
  position: Position
): Promise<CompletionItem[]> {
  const plugin = getPluginForActiveFile() as PluginJs | undefined
  if (!plugin) return []

  return await cacheFileManager(plugin, async exportData => {
    if (!exportData) return []

    const mergedData = {
      ...exportData.imp,
      ...exportData.exp,
    } as MergedExportData

    const items = plugin.buildImportItems(plugin, mergedData, Object.keys(mergedData))

    return items.map(item => {
      const completionItem = new CompletionItem(item.label, CompletionItemKind.Event)
      completionItem.detail = item.description
      const edit = insertImport(plugin, item, false) as TextEdit | void
      if (edit && !edit.range.contains(position)) completionItem.additionalTextEdits = [edit]
      return completionItem
    })
  })
}
export const CompletionItemProviderJs = {
  provideCompletionItems,
}
