import { window, workspace } from "vscode"
import path from "path"
import { isFile, getFilepathKey } from "./utils"
import utils from "./utils"

const PLUGINS = {};

const defaultSettings = {
  maxImportLineLength: 100
};

function initializePlugin(context, pluginConfig) {
  if (!workspace.workspaceFolders) return;

  let configLocation = workspace.workspaceFolders.find(
    f => path.basename(f.uri.fsPath) === ".vandelay"
  );
  configLocation = (configLocation || workspace.workspaceFolders[0]).uri.fsPath;

  const { language } = pluginConfig;
  const configFile = "vandelay-" + language + ".js";
  const configSettings = getProjectSettings(configLocation, configFile);
  if (!configSettings) return;

  const plugin = Object.assign(
    {},
    defaultSettings,
    pluginConfig,
    configSettings
  );
  PLUGINS[language] = plugin;

  plugin.cacheDirPath = context.storagePath;
  plugin.cacheFilePath = path.join(
    plugin.cacheDirPath,
    "vandelay-" + language + ".json"
  );
  plugin.projectRoot =
    configSettings.projectRoot || workspace.workspaceFolders[0].uri.fsPath;
  plugin.configFile = configFile;

  plugin.excludePatterns = plugin.excludePatterns || [];
  plugin.excludePatterns.push(/.*\/\..*/); // exclude all folders starting with dot

  console.info(`Vandelay language registered: ${language}`);

  if (!isFile(plugin.cacheFilePath)) {
    const { cacheProjectLanguage } = require("./cacher");
    cacheProjectLanguage(plugin);
  }
}

function getProjectSettings(vandelayDir, vandelayFile) {
  try {
    const absPath = path.join(vandelayDir, vandelayFile);
    console.log(`Loading vandelay config file from ${absPath}`);
    return require(absPath);
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND") {
      window.showErrorMessage(
        "Cound not parse your " + vandelayFile + " file. Error:\n\n" + e
      );
      throw e;
    }
  }
}

module.exports = {
  PLUGINS,
  initializePlugin
};
