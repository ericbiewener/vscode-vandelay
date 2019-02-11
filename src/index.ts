import { window, commands, workspace } from "vscode";
import { initializePlugin } from "./plugins";
import { cacheProject, watchForChanges } from "./cacher";
import {
  importUndefinedVariables,
  selectImport,
  selectImportForActiveWord
} from "./importer";
import jsConfig from "./plugins/javascript/config";
import pyConfig from "./plugins/python/config";
import { removeUnusedImports } from "./removeUnusedImports";
import { showNewVersionAlert } from "./showNewVersionMessage";
import { getImportItems } from "./utils";

/*
 * VS Code has an error swallowing problem, so we catch and manually log.
 */
function catchError(fn) {
  return async function(...args) {
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

export function activate(context) {
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

  const pluginConfigs = [jsConfig.config, pyConfig.config];

  for (const config of pluginConfigs) initializePlugin(context, config);

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
    registerPlugin: async ({ language }) => {
      window.showErrorMessage(
        `Please uninstall extension Vandelay ${language.toUpperCase()}. Vandelay no longer requires langauge extensions to be installed separately.`
      );
      await commands.executeCommand(
        "workbench.extensions.action.listEnabledExtensions"
      );
    }
  };
}
