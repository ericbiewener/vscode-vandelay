const { window, commands, workspace } = require('vscode')
const sinon = require('sinon')
const { sleep } = require('utlz')
const { getPlugin } = require('./utils')
require('./toMatchSnapshot')

global.sinon = sinon
global.TEST_ROOT = workspace.workspaceFolders[0].uri.path

sinon.stub(window, "showQuickPick")

let clone
beforeEach(async () => {
  if (!clone) {
    const plugin = await getPlugin()
    clone = Object.assign({}, plugin)
  }

  await commands.executeCommand('vandelay.cacheProject')
})

afterEach(async () => {
  window.showQuickPick.resetHistory()

  const plugin = await getPlugin()
  Object.assign(plugin, clone)
  for (const k in plugin) {
    if (!clone.hasOwnProperty(k)) delete plugin[k]
  }

  await commands.executeCommand('workbench.action.closeAllEditors')
  // Prevents test failures caused by text editors not being in expected open or closed state
  return sleep()
})
