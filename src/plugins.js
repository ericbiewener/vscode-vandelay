const {window, workspace} = require('vscode')
const path = require('path')
const {isFile, getFilepathKey} = require('./utils')

const PLUGINS = {}

const defaultSettings = {
  quoteType: 'single',
  padCurlyBraces: true,
  maxImportLineLength: 100,
  multilineImportStyle: 'multi',
  useSemicolons: true,
  commaDangle: false,
}

function initializePlugin(context, pluginConfig) {
  if (!workspace.workspaceFolders) return

  const config = workspace.getConfiguration('vandelay')
  const firstWorkspaceFolder = workspace.workspaceFolders[0].uri.path
  const configLocation = config.configLocation || firstWorkspaceFolder
  const projectRoot = config.projectRoot || firstWorkspaceFolder

  const {language} = pluginConfig
  const configFile = 'vandelay-' + language + '.js'
  const configSettings = getProjectSettings(configLocation, configFile)
  if (!configSettings) return

  const plugin = Object.assign({}, defaultSettings, pluginConfig, configSettings)
  PLUGINS[language] = plugin

  plugin.cacheDirPath = context.storagePath
  plugin.cacheFilePath = path.join(plugin.cacheDirPath, 'vandelay-' + language + '.json')
  plugin.projectRoot = projectRoot
  plugin.configFile = configFile

  if (plugin.ignorePaths) plugin.ignorePaths = plugin.ignorePaths.map(p => path.join(plugin.projectRoot, p))

  // Add `isExtraImport` property for use by importer
  if (plugin.extraImports) {
    for (const k in plugin.extraImports) plugin.extraImports[k].isExtraImport = true
  }

  plugin.excludePatterns = plugin.excludePatterns || []
  plugin.excludePatterns.push(/.*\/\.git(\/.*)?/)

  // Computed value, not a setting
  plugin.importOrderMap = {}
  if (Array.isArray(plugin.importOrder)) {
    plugin.importOrder.forEach((importName, i) => plugin.importOrderMap[importName] = i)
  }

  if (plugin.finalizePlugin) plugin.finalizePlugin(plugin)
  
  if (!isFile(plugin.cacheFilePath)) {
    const {cacheProjectLanguage} = require('./cacher')
    cacheProjectLanguage(plugin)
  }

  // Share some core utils with the plugin argument already provided
  plugin.utils = {
    getFilepathKey: filePath => getFilepathKey(plugin, filePath),
  }
}

function getProjectSettings(vandelayDir, vandelayFile) {
  try {
    return require(path.join(vandelayDir, vandelayFile))
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      window.showErrorMessage('Cound not parse your ' + vandelayFile + ' file. Error:\n\n' + e)
      throw e
    }
  }
}

module.exports = {
  PLUGINS,
  initializePlugin,
}
