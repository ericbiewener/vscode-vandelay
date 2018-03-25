// @flow
const {window, workspace} = require('vscode')
const path = require('path')
const _ = require('lodash')
const {SUPPORTED_LANGS} = require('./constants')

let SETTINGS

function initializeSettings() {
  // TODO need to respond to some event where workspace folders are added in order to reinitialize settings
  if (!workspace.workspaceFolders) return

  if (workspace.workspaceFolders.length > 1) {
    window.showErrorMessage('Support for multiple roots not yet implemented')
    return
  }

  const defaultSettings = {
    quoteType: 'single',
    padCurlyBraces: true,
    maxImportLineLength: 100,
    multilineImportStyle: 'multi',
    useSemicolons: true,
    commaDangle: false,
    debug: false,
  }

  SETTINGS = {}

  SUPPORTED_LANGS.forEach(lang => {
    const userSettings = getProjectSettings(lang)
    if (!userSettings) return

    SETTINGS[lang] = Object.assign({}, defaultSettings, userSettings)
    const S = SETTINGS[lang]
    
    S.lang = lang

    if (S.ignorePaths) S.ignorePaths = S.ignorePaths.map(p => path.join(S.projectRoot, p))

    // Add `isExtraImport` property for use by importer
    if (S.extraImports) {
      for (const k in S.extraImports) S.extraImports[k].isExtraImport = true
    }

    S.excludePatterns = S.excludePatterns || []
    S.excludePatterns.push(/.*\/\.git(\/.*)?/)
    if (lang === 'JS') S.excludePatterns.push(/.*\/node_modules(\/.*)?/)

    // Computed values, not really settings
    // TODO should this just be computed as-needed rather than saved?
    if (!S.importOrder || typeof S.importOrder !== 'function') {
      S.importOrderMap = Array.isArray(S.importOrder) ? _.invert(S.importOrder) : {}
    }
    if (S.debug) console.log(S)
  })
}

function getProjectSettings(lang) {
  const filename = 'vandelay.' + lang.toLowerCase() + '.js'
  try {
    if (workspace.workspaceFolders.length > 1) {
      console.log('implement multiple folders')
    } else {
      return require(path.join(workspace.workspaceFolders[0].uri.path, filename))
    }
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      window.showErrorMessage('Cound not parse your ' + filename + ' file. Error:\n\n' + e)
    }
  }
}

function getSettings(lang) {
  return SETTINGS[lang]
}

function getLang() {
  return getSettings().lang
}

module.exports = {
  initializeSettings,
  getSettings,
  getLang,
}
