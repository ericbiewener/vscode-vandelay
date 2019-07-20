import _ from 'lodash'
import { ExtensionContext, window, workspace } from 'vscode'
import path from 'path'
import { alertNewVersionConfig } from './newVersionAlerting'
import { pluginConfigs } from './registerPluginConfig'
import { findVandelayConfigDir, isFile, isObject } from './utils'
import { DefaultPluginConfig, Language, Plugin, PluginConfig, UserConfig } from './types'
import { cacheProjectLanguage } from './cacher'

// & { [key: string]: undefined } is just to quiet unneeded TS errors
export const PLUGINS: { [key in Language]?: Plugin } & { [key: string]: undefined } = {}

const defaultSettings: DefaultPluginConfig = {
  maxImportLineLength: 100,
  excludePatterns: [],
}

export async function initializePlugin(context: ExtensionContext, pluginConfig: PluginConfig) {
  const { workspaceFolders } = workspace
  if (!workspaceFolders) return

  const cacheDirPath = context.storagePath
  if (!cacheDirPath) return

  const configWorkspaceFolder = findVandelayConfigDir(workspaceFolders)
  const configPath = (configWorkspaceFolder || workspaceFolders[0]).uri.fsPath

  const { language } = pluginConfig
  const configFile = 'vandelay-' + language + '.js'
  const configFilepath = path.join(configPath, configFile)
  const userConfig = await getUserConfig(configFilepath)
  if (!userConfig) return

  const plugin = Object.assign(defaultSettings, pluginConfig, userConfig, {
    configFile,
    configFilepath,
    cacheDirPath,
    cacheFilepath: path.join(cacheDirPath, 'vandelay-v2-' + language + '.json'),
    projectRoot: userConfig.projectRoot || workspaceFolders[0].uri.fsPath,
  }) as Plugin

  plugin.excludePatterns.push(/.*\/\..*/) // exclude all folders starting with dot
  PLUGINS[language] = plugin
  context.subscriptions.push(...plugin.registerCompletionItemProvider())

  alertNewVersionConfig(plugin)

  console.info(`Vandelay language registered: ${language}`)

  if (!isFile(plugin.cacheFilepath)) {
    await cacheProjectLanguage(plugin)
    return true
  }
}

async function getUserConfig(configFilepath: string) {
  try {
    console.log(`Loading vandelay config file from ${configFilepath}`)
    // @ts-ignore
    delete __non_webpack_require__.cache[configFilepath]
    // @ts-ignore
    const userConfig = __non_webpack_require__(configFilepath)

    if (!isObject(userConfig)) {
      window.showErrorMessage('Your Vandelay configuration file must export an object.')
      return
    }

    if (!userConfig.includePaths || !userConfig.includePaths.length) {
      window.showErrorMessage(
        `You must specify the "includePaths" configuration option in your ${path.basename(
          configFilepath
        )} file.`
      )
    }
    return userConfig as UserConfig
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return // All good. Vandelay simply won't be used for the given language
    window.showErrorMessage(
      `Cound not parse your ${path.basename(configFilepath)} file. Error:\n\n${e}`
    )
    console.error(e)
  }
}

export async function initializePluginForLang(context: ExtensionContext, lang: string) {
  const config = pluginConfigs[lang]
  if (config) return initializePlugin(context, config)
}
