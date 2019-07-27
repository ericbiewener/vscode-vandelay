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
 * If we eventually find that sometimes the resolution truly doesn't complete, we can add the
 * `selectImportForActiveWord` command as a backup: https://bit.ly/2Yn8xDA. This works well because
 * it is essentially a no-op if the additionalTextEdit insertion was successful.
 *
 * Note that clicking a suggestion does NOT cause it to auto-import, but that's not a failure of
 * Vandelay's implementation -- VS Code simply doesn't trigger anything additional beyond the
 * insertion of the clicked word (i.e. even CompletionItem.command doesn't run).
 */

type RichCompletionItem<Q = RichQuickPickItem> = CompletionItem & {
  importItem: Q
  position: Position
}

export function createCompletionItemProvider(
  plugin: Plugin,
  insertImport: PluginConfig['insertImport']
) {
  return {
    async provideCompletionItems(document: TextDocument, position: Position) {
      return await cacheFileManager(plugin, async exportData => {
        if (!exportData) return [1]

        const mergedData = plugin.mergeExportData(exportData)
        const items = plugin.buildImportItems(plugin as any, mergedData, Object.keys(mergedData))

        return items.map(item => {
          const completionItem = new CompletionItem(
            item.label,
            CompletionItemKind.Event
          ) as RichCompletionItem
          completionItem.importItem = item
          completionItem.position = position
          return completionItem
        })
      })
    },

    resolveCompletionItem(completionItem: RichCompletionItem) {
      const { importItem, position } = completionItem
      completionItem.detail = `Import from:\n${importItem.description}`
      const edit = insertImport(plugin, importItem, false) as TextEdit | void
      if (edit && !edit.range.contains(position)) completionItem.additionalTextEdits = [edit]
      return completionItem
    },
  }
}
