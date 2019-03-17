const { commands } = require('vscode')
const expect = require('expect')
const { getExportData, getPlugin } = require('./utils')

it('cacheProject', async function() {
  const [plugin] = await Promise.all([
    getPlugin(),
    commands.executeCommand('vandelay.cacheProject'),
  ])
  expect(getExportData(plugin)).toMatchSnapshot(this)
})
