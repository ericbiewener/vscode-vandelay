// FIXME: notify user that they should turn off auto-import JS & TS if it is on now that Vandelay supports this
import { CompletionItem, CompletionItemKind, Position, TextDocument, TextEdit } from 'vscode'
import { cacheFileManager } from './cacheFileManager'
import { MergedExportData, PluginConfig } from './types'
import { getPluginForActiveFile } from './utils'

export function createCompletionProvider(insertImport: PluginConfig['insertImport']) {
  return {
    async provideCompletionItems(
      document: TextDocument,
      position: Position
    ): Promise<CompletionItem[]> {
      const plugin = getPluginForActiveFile()
      if (!plugin) return []

      return await cacheFileManager(plugin, async exportData => {
        if (!exportData) return []

        const mergedData = {
          ...exportData.imp,
          ...exportData.exp,
        } as MergedExportData

        const items = plugin.buildImportItems(plugin as any, mergedData, Object.keys(mergedData))

        return items.map(item => {
          const completionItem = new CompletionItem(item.label, CompletionItemKind.Event)
          completionItem.detail = item.description
          const edit = insertImport(plugin, item, false) as TextEdit | void
          if (edit && !edit.range.contains(position)) completionItem.additionalTextEdits = [edit]
          return completionItem
        })
      })
    },
  }
}
