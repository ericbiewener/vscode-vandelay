const {window, workspace} = require('vscode')
const path = require('path')
const _ = require('lodash')
const {SUPPORTED_LANGS} = require('./constants')

const SETTINGS = {}

const LANG_PROCESSOR = {
  js(S) {
    S.supportedExtensions = ['js', 'jsx']
    S.excludePatterns.push(/.*\/node_modules(\/.*)?/)
  },
  py(S) {
    S.supportedExtensions = ['py']
  },
}

function initializeSettings() {
  const {workspaceFolders} = workspace
  // TODO: need to respond to some event where workspace folders are added in order to reinitialize settings
  if (!workspaceFolders) return
  
  const vandelayDir = workspaceFolders.length > 1
    ? workspaceFolders.find(f => f.name === '.vandelay')
    : workspaceFolders[0].uri.path

  if (!vandelayDir) return // could occur if multiple workspace folders but no `.vandelay` folder

  const defaultSettings = {
    quoteType: 'single',
    padCurlyBraces: true,
    maxImportLineLength: 100,
    multilineImportStyle: 'multi',
    useSemicolons: true,
    commaDangle: false,
    debug: false,
  }

  SUPPORTED_LANGS.forEach(lang => {
    const settingsFile = 'vandelay-' + lang + '.js'
    const userSettings = getProjectSettings(lang, settingsFile, vandelayDir)
    if (!userSettings) return

    SETTINGS[lang] = Object.assign({}, defaultSettings, userSettings)
    const S = SETTINGS[lang]

    S.cacheFile = path.join(vandelayDir, '.vandelay-' + lang)
    S.projectRoot = path.dirname(vandelayDir)
    S.settingsFile = settingsFile

    if (S.ignorePaths) S.ignorePaths = S.ignorePaths.map(p => path.join(S.projectRoot, p))

    // Add `isExtraImport` property for use by importer
    if (S.extraImports) {
      for (const k in S.extraImports) S.extraImports[k].isExtraImport = true
    }

    S.excludePatterns = S.excludePatterns || []
    S.excludePatterns.push(/.*\/\.git(\/.*)?/)

    // Computed values, not really settings
    // TODO should this just be computed as-needed rather than saved?
    if (!S.importOrder || typeof S.importOrder !== 'function') {
      S.importOrderMap = Array.isArray(S.importOrder) ? _.invert(S.importOrder) : {}
    }

    LANG_PROCESSOR[lang](S)
    if (S.debug) console.log(S)
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
