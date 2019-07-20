import fs from 'fs-extra'
import path from 'path'
import {
  commands,
  ExtensionContext,
  languages,
  Position,
  TextEditor,
  Uri,
  window,
  workspace,
  WorkspaceFolder,
} from 'vscode'
import { finalizeExtensionActivation } from '../initialization/finalizeExtensionActivation'
import { initializePlugin } from '../plugins'
import { pluginConfigs } from '../registerPluginConfig'
import { findVandelayConfigDir, showProjectExportsCachedMessage } from '../utils'

interface IncludePathQuickPickItem {
  label: string
  pathStr: string
}

export async function initProject(context: ExtensionContext) {
  const { workspaceFolders } = workspace

  if (!workspaceFolders) {
    window.showErrorMessage(
      'You must add a workspace folder before initializing a Vandelay configuration file.'
    )
    return
  }

  return workspaceFolders.length > 1
    ? initProjectMultiRoot(context, workspaceFolders)
    : initProjectSingleRoot(context, workspaceFolders)
}

async function initProjectSingleRoot(
  context: ExtensionContext,
  workspaceFolders: WorkspaceFolder[]
) {
  const selection = await getLanguageSelection()
  if (!selection) return

  const { language, configFile } = selection
  const configFilepath = path.join(workspaceFolders[0].uri.fsPath, configFile)

  const openPromise = openExistingConfigFile(configFilepath)
  if (openPromise) return openPromise

  // Select includePaths
  const subdirs = await getSubdirs(workspaceFolders[0].uri.fsPath)
  const includePathOptions: IncludePathQuickPickItem[] = subdirs.map(s => ({
    label: s,
    pathStr: `path.join(__dirname, '${s}')`,
  }))
  const includePaths = await getIncludePathSelections(includePathOptions)
  if (!includePaths) return

  const text = buildText("const path = require('path')\n\n", buildIncludePathText(includePaths))
  await createAndOpenFile(context, configFilepath, text, !!includePaths.length)
}

// FIXME: make context a globally importable constant, stop passing it around
async function initProjectMultiRoot(
  context: ExtensionContext,
  workspaceFolders: WorkspaceFolder[]
) {
  const configDir = findVandelayConfigDir(workspaceFolders)
  if (!configDir) {
    window.showErrorMessage(
      'You must create a folder named `.vandelay` and add that to your workspace before you can initialize a new Vandelay project.',
      { modal: true }
    )
    return
  }

  const selection = await getLanguageSelection()
  if (!selection) return

  const { language, configFile } = selection
  const configFilepath = configDir ? path.join(configDir.uri.fsPath, configFile) : null

  const openPromise = configFilepath ? openExistingConfigFile(configFilepath) : null
  if (openPromise) return openPromise

  // Select includePaths
  const includePathOptions: IncludePathQuickPickItem[] = workspaceFolders.map(f => ({
    label: f.name,
    pathStr: `'${f.uri.fsPath}'`,
  }))

  const includePaths = await getIncludePathSelections(includePathOptions)
  if (!includePaths) return

  let text = configFilepath
    ? ''
    : `/**
* FIXME: Since you are using a multi-root workspace, you must save this file inside a directory named
* \`.vandelay\` and add that folder to your workspace. This file should itself be named \`vandelay-${language}.js\`.
*/

`
  text = buildText(text, buildIncludePathText(includePaths))

  // If `configFilepath` exists, that means a `.vandelay` directory exists in which we can create
  // the file
  if (configFilepath) return createAndOpenFile(context, configFilepath, text, !!includePaths.length)

  await commands.executeCommand('workbench.action.files.newUntitledFile')
  const editor = window.activeTextEditor as TextEditor
  await Promise.all([
    editor.edit(builder => builder.insert(new Position(0, 0), text)),
    languages.setTextDocumentLanguage(editor.document, 'javascript'),
  ])
}

async function getLanguageSelection() {
  const selection = await window.showQuickPick(
    [{ label: 'JavaScript / TypeScript', language: 'js' }, { label: 'Python', language: 'py' }],
    { placeHolder: 'Which language?' }
  )
  if (!selection) return

  return { language: selection.language, configFile: `vandelay-${selection.language}.js` }
}

function openExistingConfigFile(configFilepath: string) {
  if (pathExists(configFilepath)) {
    window.showInformationMessage('Vandelay configuration file already exists.')
    return window.showTextDocument(Uri.file(configFilepath))
  }
}

function getIncludePathSelections(includePathOptions: IncludePathQuickPickItem[]) {
  return window.showQuickPick(includePathOptions.filter(f => !f.label.startsWith('.')), {
    canPickMany: true,
    placeHolder: 'Which paths contain your source files? Leave empty to enter manually.',
  })
}

function buildIncludePathText(includePaths: IncludePathQuickPickItem[]) {
  return includePaths.length ? `\n    ${includePaths.map(i => i.pathStr).join(',\n    ')},\n  ` : ''
}

function buildText(text: string, includePathText: string) {
  return `${text}/**
 * Configuration file for VS Code Vandelay extension.
 * https://github.com/ericbiewener/vscode-vandelay#configuration
 */

module.exports = {
  // This is the only required property. At least one path must be included.
  includePaths: [${includePathText}],
}
`
}

async function getSubdirs(dir: string) {
  const items = await fs.readdir(dir)
  const statPromises = items.map(async item => {
    const filepath = path.join(dir, item)
    const stats = await fs.stat(filepath)
    return { item, stats }
  })
  const results = await Promise.all(statPromises)
  return results.filter(result => result.stats.isDirectory()).map(result => result.item)
}

function pathExists(testPath: string) {
  try {
    fs.accessSync(testPath)
    return true
  } catch (e) {
    return false
  }
}

async function createAndOpenFile(
  context: ExtensionContext,
  filepath: string,
  text: string,
  hasIncludePaths: boolean
) {
  await fs.writeFile(filepath, text)
  await window.showTextDocument(Uri.file(filepath))

  if (hasIncludePaths) {
    const file = path.basename(filepath, '.js')
    const lang = file.split('-')[1]
    const config = pluginConfigs[lang]
    if (config) {
      await initializePlugin(context, config)
      finalizeExtensionActivation(context)
      showProjectExportsCachedMessage()
    }
  }
}
