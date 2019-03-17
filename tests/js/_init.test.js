const { commands } = require('vscode')
const { getPlugin } = require('./utils')
require('./toMatchSnapshot')

let clone
beforeEach(async () => {
  if (!clone) {
    const plugin = await getPlugin()
    clone = Object.assign({}, plugin)
  }

  await commands.executeCommand('vandelay.cacheProject')
})

afterEach(async () => {
  const plugin = await getPlugin()
  Object.assign(plugin, clone)
  for (const k in plugin) {
    if (!clone.hasOwnProperty(k)) delete plugin[k]
  }

  await commands.executeCommand('workbench.action.closeAllEditors')
  // Prevents test failures caused by text editors not being in expected open or closed state
  return new Promise(resolve => setTimeout(resolve, 10))
})
