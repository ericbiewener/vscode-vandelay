import _ from 'lodash'
import { ExtensionContext, window, workspace } from 'vscode'
import path from 'path'
import { alertNewVersionConfig } from './newVersionAlerting'
import { isFile, isObject } from './utils'
import { Plugin, PluginConfig, UserConfig, DefaultPluginConfig } from './types'
import { cacheProjectLanguage } from './cacher'

export const PLUGINS: { [lang: string]: Plugin } = {}

const defaultSettings: DefaultPluginConfig = {
  maxImportLineLength: 100,
  excludePatterns: [],
}

export async function initializePlugin(context: ExtensionContext, pluginConfig: PluginConfig) {
  if (!workspace.workspaceFolders) return

  const cacheDirPath = context.storagePath
  if (!cacheDirPath) return

  const configWorkspaceFolder = workspace.workspaceFolders.find(
    f => path.basename(f.uri.fsPath) === '.vandelay'
  )
  const configPath = (configWorkspaceFolder || workspace.workspaceFolders[0]).uri.fsPath

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
    projectRoot: userConfig.projectRoot || workspace.workspaceFolders[0].uri.fsPath,
  }) as Plugin

  plugin.excludePatterns.push(/.*\/\..*/) // exclude all folders starting with dot
  PLUGINS[language] = plugin

  alertNewVersionConfig(plugin)

  console.info(`Vandelay language registered: ${language}`)

  if (!isFile(plugin.cacheFilepath)) return cacheProjectLanguage(plugin)
}

async function getUserConfig(configFilepath: string, ignoreModuleCache = false) {
  try {
    console.log(`Loading vandelay config file from ${configFilepath}`)
    if (ignoreModuleCache) {
      // @ts-ignore
      delete __non_webpack_require__.cache[configFilepath]
    }
    // @ts-ignore
    const userConfig = __non_webpack_require__(configFilepath)
    if (isObject(userConfig)) {
      if (!userConfig.includePaths || !userConfig.includePaths.length) {
        window.showErrorMessage(
          `You must specify the "includePaths" configuration option in your ${path.basename(
            configFilepath
          )} file.`
        )
        return
      }
      return userConfig as UserConfig
    }
    window.showErrorMessage('Your Vandelay configuration file must export an object.')
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return // All good. Vandelay simply won't be used for the given language
    window.showErrorMessage(
      `Cound not parse your ${path.basename(configFilepath)} file. Error:\n\n${e}`
    )
    console.error(e)
  }
}

function onConfigCreate() {
  // initialize entire plugin, activate vandelay, etc!
  // should also init plugin if config file changes to become valid (e.g. it originally existed
  // without `includePaths` defined but is changed to include it)
}

export function watchForConfigChanges() {
  workspace.onDidSaveTextDocument(async doc => {
    for (const plugin of Object.values(PLUGINS)) {
      if (doc.uri.fsPath !== plugin.configFilepath) continue
      const userConfig = await getUserConfig(plugin.configFilepath, true)
      Object.assign(plugin, userConfig)
      break
    }
  })
}
