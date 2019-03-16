import { window, commands, workspace, ExtensionContext } from "vscode";
import { initializePlugin } from "./plugins";
import { cacheProject, watchForChanges } from "./cacher";
import {
  importUndefinedVariables,
  selectImport,
  selectImportForActiveWord
} from "./importer";
import { config as jsConfig } from "./plugins/javascript/config";
// import { config as pyConfig} from "./plugins/python/config";
import { removeUnusedImports } from "./removeUnusedImports";
import { showNewVersionAlert } from "./showNewVersionMessage";

// FIXME: .vscodeignore src dir and others

/*
 * VS Code has an error swallowing problem, so we catch and manually log.
 */
function catchError(fn: (...args: any[]) => any) {
  return async function(...args: any[]) {
    try {
      const result = await fn(...args);
      return result;
    } catch (e) {
      console.error(e);
      window.showErrorMessage(
        'Vandelay extension error! Please run the "Toggle Developer Tools" VS Code command and post the stacktrace at https://github.com/ericbiewener/vscode-vandelay.'
      );
      throw e;
    }
  };
}

export async function activate(context: ExtensionContext) {
  showNewVersionAlert(context);

  context.subscriptions.push(
    commands.registerCommand("vandelay.cacheProject", catchError(cacheProject)),
    commands.registerCommand(
      "vandelay.selectImport",
      catchError(() => selectImport())
    ),
    commands.registerCommand(
      "vandelay.selectImportForActiveWord",
      catchError(() => selectImportForActiveWord())
    ),
    commands.registerCommand(
      "vandelay.importUndefinedVariables",
      catchError(() => importUndefinedVariables())
    ),
    commands.registerCommand(
      "vandelay.removeUnusedImports",
      catchError(removeUnusedImports)
    ),
    commands.registerCommand(
      "vandelay.fixImports",
      catchError(() => {
        removeUnusedImports();
        importUndefinedVariables();
      })
    )
  );

  const pluginConfigs = [jsConfig];
  // const pluginConfigs = [jsConfig, pyConfig];

  await Promise.all(pluginConfigs.map(c => initializePlugin(context, c)));

  context.subscriptions.push(
    workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration("vandelay.configLocation") ||
        e.affectsConfiguration("vandelay.projectRoot")
      ) {
        pluginConfigs.forEach(config => initializePlugin(context, config));
      }
    }),

    watchForChanges()
  );

  return {
    registerPlugin: async ({ language }: { language: string }) => {
      window.showErrorMessage(
        `Please uninstall extension Vandelay ${language.toUpperCase()}. Vandelay no longer requires langauge extensions to be installed separately.`
      );
      await commands.executeCommand(
        "workbench.extensions.action.listEnabledExtensions"
      );
    }
  };
}
