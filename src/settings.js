const {window, workspace} = require('vscode')
const path = require('path')
const {SUPPORTED_LANGS} = require('./constants')

const SETTINGS = {}

const LANG_PROCESSOR = {
  js(S) {
    S.excludePatterns.push(/.*\/node_modules(\/.*)?/)
  },
}

function initializeSettings(context) {
  const {workspaceFolders, getConfiguration} = workspace
  if (!workspaceFolders) return

  const config = getConfiguration('vandelay')
  const configLocation = config.configLocation || workspaceFolders[0].uri.path
  const projectRoot = config.projectRoot || workspaceFolders[0].uri.path

  const defaultSettings = {
    quoteType: 'single',
    padCurlyBraces: true,
    maxImportLineLength: 100,
    multilineImportStyle: 'multi',
    useSemicolons: true,
    commaDangle: false,
  }

  SUPPORTED_LANGS.forEach(lang => {
    const settingsFile = 'vandelay-' + lang + '.js'
    const userSettings = getProjectSettings(lang, settingsFile, configLocation)
    if (!userSettings) return

    SETTINGS[lang] = Object.assign({}, defaultSettings, userSettings)
    const S = SETTINGS[lang]

    S.cacheDir = context.storagePath
    S.cacheFile = path.join(S.cacheDir, 'vandelay-' + lang + '.json')
    S.projectRoot = projectRoot
    S.settingsFile = settingsFile

    if (S.ignorePaths) S.ignorePaths = S.ignorePaths.map(p => path.join(S.projectRoot, p))

    // Add `isExtraImport` property for use by importer
    if (S.extraImports) {
      for (const k in S.extraImports) S.extraImports[k].isExtraImport = true
    }

    S.excludePatterns = S.excludePatterns || []
    S.excludePatterns.push(/.*\/\.git(\/.*)?/)

    // Computed value, not a setting
    S.importOrderMap = {}
    if (Array.isArray(S.importOrder)) {
      S.importOrder.forEach((importName, i) => S.importOrderMap[importName] = i)
    }

    const langProcessor = LANG_PROCESSOR[lang]
    if (langProcessor) langProcessor(S)
  })
}

function getProjectSettings(lang, settingsFile, vandelayDir) {
  try {
    return require(path.join(vandelayDir, settingsFile))
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      window.showErrorMessage('Cound not parse your ' + settingsFile + ' file. Error:\n\n' + e)
      throw e
    }
  }
}

module.exports = {
  SETTINGS,
  initializeSettings,
}
