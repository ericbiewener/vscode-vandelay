const fs = require('fs')
const path = require('path')
const { sleep } = require('utlz')
const { window, workspace, extensions, Uri, commands } = require('vscode')

async function getPlugin() {
  const api = await extensions.getExtension('edb.vandelay').activate()
  return api._test.plugins[global.lang]
}

function openFile(...fileParts) {
  return window.showTextDocument(
    Uri.file(
      fileParts.length
        ? path.join(TEST_ROOT, ...fileParts)
        : path.join(TEST_ROOT, `src1/file1.${global.lang}`)
    )
  )
}

async function getExportData() {
  const plugin = await getPlugin()
  return JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
}

function testSpyCall(context, call) {
  expect(call.args.map(p => p.replace(TEST_ROOT, 'absRoot'))).toMatchSnapshot(
    context
  )
}

async function cacheTest(context, config) {
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  Object.assign(plugin, config)
  await commands.executeCommand('vandelay.cacheProject')
  const data = JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
  expect(data).toMatchSnapshot(context)
}

async function buildImportItems() {
  await commands.executeCommand("vandelay.selectImport");
  const items = window.showQuickPick.args[0][0]
  return items
}

async function saveFile() {
  await openFile('src1/file6.js')
  await commands.executeCommand('workbench.action.files.save')
  return await sleep(1000) // Previous command file watcher won't have completed yet
}

module.exports = {
  getPlugin,
  openFile,
  getExportData,
  testSpyCall,
  cacheTest,
  buildImportItems,
  saveFile,
}
