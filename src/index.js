const { window, commands, workspace } = require("vscode");
const { initializePlugin } = require("./plugins");
const { cacheProject, watchForChanges } = require("./cacher");
const {
  importUndefinedVariables,
  selectImport,
  selectImportForActiveWord
} = require("./importer");
const jsConfig = require("./plugins/javascript/config");
const pyConfig = require("./plugins/python/config");
const { removeUnusedImports } = require("./removeUnusedImports");
const { showNewVersionAlert } = require("./showNewVersionMessage");
const { getImportItems } = require("./utils");

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

function activate(context) {
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
}

exports.activate = activate;
