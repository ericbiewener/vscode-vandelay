import { window, workspace, ExtensionContext } from 'vscode'
import path from 'path'
import { alertNewVersionConfig } from './newVersionAlerting'
import { isFile, getFilepathKey } from './utils'
import { Plugin, PluginConfig, UserConfig, DefaultPluginConfig } from './types'
import { cacheProjectLanguage } from './cacher'

export const PLUGINS: { [lang: string]: Plugin } = {}

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
  const userConfig = await getUserConfig(configPath, configFile)
  if (!userConfig) return

  if (!userConfig.includePaths || !userConfig.includePaths.length) {
    window.showErrorMessage(
      `You must specify the "includePaths" configuration option in your vandelay-${language}.js file.`
    )
    return
  }

  const plugin = Object.assign(defaultSettings, pluginConfig, userConfig, {
    configFile,
    cacheDirPath,
    cacheFilePath: path.join(cacheDirPath, 'vandelay-v2-' + language + '.json'),
    projectRoot:
      userConfig.projectRoot || workspace.workspaceFolders[0].uri.fsPath,
  }) as Plugin

  plugin.excludePatterns.push(/.*\/\..*/) // exclude all folders starting with dot
  PLUGINS[language] = plugin

  alertNewVersionConfig(plugin)

  console.info(`Vandelay language registered: ${language}`)

  if (!isFile(plugin.cacheFilePath)) return cacheProjectLanguage(plugin)
}

async function getUserConfig(vandelayDir: string, vandelayFile: string) {
  try {
    const absPath = path.join(vandelayDir, vandelayFile)
    console.log(`Loading vandelay config file from ${absPath}`)
    // @ts-ignore -- use default `require` for dynamic imports
    const userConfig = __non_webpack_require__(absPath)
    if (typeof userConfig === 'object') return userConfig as UserConfig
    window.showErrorMessage(
      'Your Vandelay configuration file must export an object.'
    )
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return // All good. Vandelay simply won't be used for the given language
    window.showErrorMessage(
      'Cound not parse your ' + vandelayFile + ' file. Error:\n\n' + e
    )
  }
}
