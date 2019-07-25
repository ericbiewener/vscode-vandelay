// FIXME: notify user that they should turn off auto-import JS & TS if it is on now that Vandelay supports this
import {
  CancellationToken,
  CompletionItem,
  CompletionItemKind,
  Position,
  TextDocument,
  TextEdit,
} from 'vscode'
import { cacheFileManager } from './cacheFileManager'
import { MergedExportData, Plugin, PluginConfig, RichQuickPickItem } from './types'

/**
 * Although we are not supposed to modify `CompletionItem.additionalTextEdits` inside
 * `resolveCompletionItem`, computing the potential text edit for every import up front won't scale
 * as a codebase grows. It's not slow... Mumbai took ~150-250 ms, but that's 3-5 times slower than
 * deferring that work until `resolveCompletionItems`.
 *
 * Therefore, we do the work in `resolveCompletionItems`. Although it is apparently possible that
 * the additional text edit will not complete by the time the CompletionItem is resolved, I am
 * consistently seeing resolve times in *under 1ms*! Seems pretty much impossible to select a
 * CompletionItem before that resolution completes.
 * 
 * If we eventually find that sometimes the resolution truly doesn't complete, we can 
 */

type RichCompletionItem<Q = RichQuickPickItem> = CompletionItem & {
  importItem: Q
  position: Position
}

const COMMAND = {
  title: 'Import Active Word...',
  command: 'vandelay.selectImportForActiveWord',
}

export function createCompletionItemProvider(
  plugin: Plugin,
  insertImport: PluginConfig['insertImport']
) {
  return {
    async provideCompletionItems(
      document: TextDocument,
      position: Position
    ): Promise<CompletionItem[]> {
      return await cacheFileManager(plugin, async exportData => {
        if (!exportData) return []

        const mergedData = {
          ...exportData.imp,
          ...exportData.exp,
        } as MergedExportData

        const items = plugin.buildImportItems(plugin as any, mergedData, Object.keys(mergedData))

        console.time("create items")
        const rv = items.map(item => {
          const completionItem = new CompletionItem(
            item.label,
            CompletionItemKind.Event
          ) as RichCompletionItem
          completionItem.importItem = item
          completionItem.position = position
          return completionItem
        })
        console.timeEnd("create items")
        return rv
      })
    },

    resolveCompletionItem(completionItem: RichCompletionItem, token: CancellationToken) {
        console.time("resolve item")
        const { importItem, position } = completionItem
      completionItem.command = COMMAND
      completionItem.detail = `Import from:\n${importItem.description}`
      const edit = insertImport(plugin, importItem, false) as TextEdit | void
      if (edit && !edit.range.contains(position)) completionItem.additionalTextEdits = [edit]
        console.timeEnd("resolve item")
        return completionItem
    },
  }
}
