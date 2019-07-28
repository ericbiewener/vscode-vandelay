import { commands, ExtensionContext, workspace } from 'vscode'
import { cacheProject, watchForChanges } from '../cacher'
import { importUndefinedVariables, selectImport, selectImportForActiveWord } from '../importer'
import { initializePlugins } from '../main'
import { removeUnusedImports } from '../removeUnusedImports'
import { catchError } from './catchError'

let hasFinalized = false

export function isActivationComplete() {
  return hasFinalized
}

export function finalizeExtensionActivation(context: ExtensionContext) {
  if (hasFinalized) return
  hasFinalized = true

  context.subscriptions.push(
    commands.registerCommand('vandelay.cacheProject', catchError(cacheProject)),
    commands.registerCommand('vandelay.selectImport', catchError(() => selectImport())),
    commands.registerCommand(
      'vandelay.selectImportForActiveWord',
      catchError(() => selectImportForActiveWord())
    ),
    commands.registerCommand(
      'vandelay.importUndefinedVariables',
      catchError(() => importUndefinedVariables())
    ),
    commands.registerCommand('vandelay.removeUnusedImports', catchError(removeUnusedImports)),
    commands.registerCommand(
      'vandelay.fixImports',
      catchError(async () => {
        await removeUnusedImports()
        await importUndefinedVariables()
      })
    ),

    workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration('vandelay.configLocation') ||
        e.affectsConfiguration('vandelay.projectRoot')
      ) {
        initializePlugins(context)
      }
    }),

    watchForChanges()
  )
}
