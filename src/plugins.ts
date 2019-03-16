import { window, workspace, ExtensionContext } from "vscode";
import path from "path";
import { isFile, getFilepathKey } from "./utils";
import { Plugin, PluginConfig } from "./types";

export const PLUGINS: { [lang: string]: Plugin } = {};

const defaultSettings = {
  maxImportLineLength: 100
};

export function initializePlugin(
  context: ExtensionContext,
  pluginConfig: PluginConfig
) {
  if (!workspace.workspaceFolders) return;

  const configWorkspaceFolder = workspace.workspaceFolders.find(
    f => path.basename(f.uri.fsPath) === ".vandelay"
  );
  const configPath = (configWorkspaceFolder || workspace.workspaceFolders[0])
    .uri.fsPath;

  const { language } = pluginConfig;
  const configFile = "vandelay-" + language + ".js";
  const configSettings = getProjectSettings(configPath, configFile);
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

function getProjectSettings(vandelayDir: string, vandelayFile: string) {
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
