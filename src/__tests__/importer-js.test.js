const path = require('path')
const {window} = require('vscode')
const {readCacheFileJs} = require('../importer-js')
const {initializeSettings} = require('../settings.js')
const {cacheProject} = require('../cacher')

const fileName = path.join(__dirname, '../../test-project/import-test.js')
window.activeTextEditor = {document: {fileName}}

initializeSettings()

test('readCacheFileJs', async () => {
  await cacheProject()
  expect(readCacheFileJs()).toMatchSnapshot()
})
