import { window, workspace, ExtensionContext } from 'vscode'
import path from 'path'
import { isFile, getFilepathKey } from './utils'
import { Plugin, PluginConfig, UserConfig, DefaultPluginConfig } from './types'
import { cacheProjectLanguage } from './cacher'

export const PLUGINS: { [lang: string]: Plugin } = {}
const watchers: { [path: string]: boolean } = {}

const defaultSettings: DefaultPluginConfig = {
  maxImportLineLength: 100,
  excludePatterns: [],
}

export async function initializePlugin(
  context: ExtensionContext,
  pluginConfig: PluginConfig
) {
  if (!workspace.workspaceFolders) return

  const cacheDirPath = context.storagePath
  if (!cacheDirPath) return

  const configWorkspaceFolder = workspace.workspaceFolders.find(
    f => path.basename(f.uri.fsPath) === '.vandelay'
  )
  const configPath = (configWorkspaceFolder || workspace.workspaceFolders[0])
    .uri.fsPath

  const { language } = pluginConfig
  const configFile = 'vandelay-' + language + '.js'
  const configFilepath = path.join(configPath, configFile)
  const userConfig = await getUserConfig(configFilepath, language)
  if (!userConfig) return

  const plugin = Object.assign(defaultSettings, pluginConfig, userConfig, {
    configFile,
    cacheDirPath,
    cacheFilepath: path.join(cacheDirPath, 'vandelay-v2-' + language + '.json'),
    projectRoot:
      userConfig.projectRoot || workspace.workspaceFolders[0].uri.fsPath,
  }) as Plugin

  plugin.excludePatterns.push(/.*\/\..*/) // exclude all folders starting with dot
  PLUGINS[language] = plugin

  // Watch for changes to vandelay-*.js file
  if (!watchers[configFilepath]) {
    watchers[configFilepath] = true
    const watcher = workspace
      .createFileSystemWatcher(configFilepath)
      .onDidChange(async () => {
        const userConfig = await getUserConfig(configFilepath, language)
        Object.assign(plugin, userConfig)
      })
    context.subscriptions.push(watcher)
  }

  console.info(`Vandelay language registered: ${language}`)

  if (!isFile(plugin.cacheFilepath)) return cacheProjectLanguage(plugin)
}

async function getUserConfig(configFilepath: string, language: string) {
  try {
    console.info(`Loading vandelay config file from ${configFilepath}`)
    // @ts-ignore -- use default `require` for dynamic imports
    const userConfig = __non_webpack_require__(configFilepath)
    if (typeof userConfig === 'object') {
      if (!userConfig.includePaths || !userConfig.includePaths.length) {
        window.showErrorMessage(
          `You must specify the "includePaths" configuration option in your vandelay-${language}.js file.`
        )
        return
      }
      return userConfig as UserConfig
    }
    window.showErrorMessage(
      'Your Vandelay configuration file must export an object.'
    )
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return // All good. Vandelay simply won't be used for the given language
    window.showErrorMessage(
      `Cound not parse your ${path.basename(
        configFilepath
      )} file. Error:\n\n${e}`
    )
  }
}
