const { commands } = require('vscode')
const {
  cacheTest,
  openFile,
  getExportData,
  saveFile,
  buildImportItems,
  insertTest,
} = require('./utils')

function cacheTests() {
  it('cacheProject', async function () {
    await cacheTest(this)
  })

  it('cacheFile', async function () {
    const filepath = `src1/file2.${global.lang}`
    await saveFile(filepath)
    const data = await getExportData()
    expect(data.exp[filepath].cached > 0).toBe(true)
  })
}

function importTests() {
  it('buildImportItems', async function () {
    await saveFile(`src1/file2.${global.lang}`) // Set .cached on one file's exports
    await openFile()
    const items = await buildImportItems()

    if (global.lang === 'js') {
      for (const i of items) i.absImportPath = i.absImportPath.replace(TEST_ROOT, 'absRoot')
    }
    expect(items).toMatchSnapshot(this)
  })

  it('import - empty', async function () {
    await insertTest(this)
  })
}

module.exports = {
  cacheTests,
  importTests,
}
