const { window, commands, workspace } = require('vscode')
const sinon = require('sinon')
const { sleep } = require('@ericbiewener/utils/src/sleep')
const { getPlugin } = require('./utils')
require('./toMatchSnapshot')

global.sinon = sinon

sinon.stub(window, 'showQuickPick')
sinon.spy(window, 'showWarningMessage')

before(async () => {
  const plugin = await getPlugin()
  global.TEST_ROOT = plugin.projectRoot
})

let clone
beforeEach(async () => {
  if (!clone) {
    const plugin = await getPlugin()
    clone = Object.assign({}, plugin)
  }

  await commands.executeCommand('vandelay.cacheProject')
})

afterEach(async () => {
  window.showQuickPick.reset()
  window.showWarningMessage.resetHistory()

  const plugin = await getPlugin()
  Object.assign(plugin, clone)
  for (const k in plugin) {
    if (!clone.hasOwnProperty(k)) delete plugin[k]
  }

  await commands.executeCommand('workbench.action.closeAllEditors')
  // Prevents test failures caused by text editors not being in expected open or closed state
  return sleep(50)
})
