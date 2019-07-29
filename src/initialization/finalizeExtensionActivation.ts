import { commands, workspace } from 'vscode'
import { cacheProject, watchForChanges } from '../cacher'
import { globals } from '../globals'
import { importUndefinedVariables, selectImport, selectImportForActiveWord } from '../importer'
import { initializePlugins } from '../main'
import { removeUnusedImports } from '../removeUnusedImports'
import { catchError } from './catchError'
import { findUnusedExports } from './findUnusedExports'

let hasFinalized = false

export function isActivationComplete() {
  return hasFinalized
}

export function finalizeExtensionActivation() {
  if (hasFinalized) return
  hasFinalized = true

  globals.ctx.subscriptions.push(
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
    commands.registerCommand('vandelay.findUnusedExports', catchError(findUnusedExports)),

    workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration('vandelay.configLocation') ||
        e.affectsConfiguration('vandelay.projectRoot')
      ) {
        initializePlugins()
      }
    }),

    watchForChanges()
  )
}
