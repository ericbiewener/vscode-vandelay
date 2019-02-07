const { commands, extensions, window } = require("vscode");
const semver = require("semver-compare");
const { cacheFile, processCachedData } = require("./cacher");
const { buildImportItems, insertImport } = require("./importing/importer");
const { removeUnusedImports } = require("./removeUnusedImports");
const { shouldIncludeDisgnostic } = require("./utils");

async function activate(context) {
  console.log("Vandelay Python: Activating");
  const ext = extensions.getExtension("edb.vandelay");
  if (!ext) {
    window.showErrorMessage(
      "You must install the core Vandelay package to use Vandelay Python: https://github.com/ericbiewener/vscode-vandelay"
    );
    return;
  }
  if (semver(ext.packageJSON.version, "1.0.1") < 0) {
    window.showErrorMessage(
      "Your core Vandelay package needs to be updated. Vandelay Python will not work until you update."
    );
    await commands.executeCommand(
      "workbench.extensions.action.listOutdatedExtensions"
    );
    return;
  }

  const vandelay = await ext.activate();

  let plugin;
  const _test = {};

  console.log("Vandelay Python: registerPlugin");
  vandelay.registerPlugin({
    language: "py",
    cacheFile,
    processCachedData,
    buildImportItems,
    insertImport,
    removeUnusedImports,
    multilineImportParentheses: true,
    shouldIncludeDisgnostic,
    context,
    newVersionAlert: {
      name: "Vandelay Python",
      changelogUrl:
        "https://github.com/ericbiewener/vscode-vandelay-py/blob/master/CHANGELOG.md",
      extensionIdentifier: "edb.vandelay-py",
      suppressAlert: true
    },
    finalizePlugin(finalPlugin) {
      plugin = finalPlugin;
      console.log("Vandelay Python: finalized", plugin);
      plugin._test = vandelay._test;
      _test.plugin = plugin;
    }
  });

  return _test;
}
exports.activate = activate;
