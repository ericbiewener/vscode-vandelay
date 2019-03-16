import { window, workspace, ExtensionContext } from "vscode";
import path from "path";
import { isFile, getFilepathKey } from "./utils";
import { Plugin, PluginConfig, UserConfig } from "./types";
import { cacheProjectLanguage } from "./cacher";

export const PLUGINS: { [lang: string]: Plugin } = {};

const defaultSettings = {
  maxImportLineLength: 100,
  excludePatterns: []
};

export async function initializePlugin(
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
  const configSettings = await getProjectSettings(configPath, configFile);

  const cacheDirPath = context.storagePath;
  if (!cacheDirPath) return;

  const plugin: Plugin = Object.assign(
    defaultSettings,
    pluginConfig,
    configSettings,
    {
      configFile,
      cacheDirPath,
      cacheFilePath: path.join(cacheDirPath, "vandelay-" + language + ".json"),
      projectRoot:
        configSettings.projectRoot || workspace.workspaceFolders[0].uri.fsPath
    }
  );

  plugin.excludePatterns.push(/.*\/\..*/); // exclude all folders starting with dot
  PLUGINS[language] = plugin;

  console.info(`Vandelay language registered: ${language}`);

  if (!isFile(plugin.cacheFilePath)) cacheProjectLanguage(plugin);
}

async function getProjectSettings(
  vandelayDir: string,
  vandelayFile: string
): Promise<UserConfig> {
  try {
    const absPath = path.join(vandelayDir, vandelayFile);
    console.log(`Loading vandelay config file from ${absPath}`);
    // @ts-ignore
    const configSettings = await Promise.resolve(
      __non_webpack_require__(absPath)
    );
    if (typeof configSettings === "object") return configSettings as UserConfig;

    window.showErrorMessage(
      "Your Vandelay configuration file must export an object."
    );
    throw new Error("Vandelay configuration file must export an object.");
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      window.showErrorMessage(
        "Your Vandelay configuration file was not found."
      );
    } else {
      window.showErrorMessage(
        "Cound not parse your " + vandelayFile + " file. Error:\n\n" + e
      );
    }
    throw e;
  }
}
