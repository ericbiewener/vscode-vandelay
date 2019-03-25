const { commands } = require('vscode')
const { cacheTest, openFile, getExportData, activateVandelay, saveFile } = require('./utils')

function cacheTests() {

  it('cacheProject', async function() {
    await cacheTest(this)
  })

  it('cacheFile', async function() {
    await saveFile()
    const data = await getExportData()
    expect(data.exp['src1/file6.js'].cached > 0).toBe(true)
  })
}

module.exports = {
  cacheTests,
}
