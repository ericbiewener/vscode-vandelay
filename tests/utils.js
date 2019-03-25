const path = require('path')
const { window, workspace, extensions, Uri } = require('vscode')

async function getPlugin() {
  const api = await extensions.getExtension('edb.vandelay').activate()
  return api._test.plugins[global.lang]
}

function openFile(...fileParts) {
  return window.showTextDocument(
    Uri.file(
      fileParts.length
        ? path.join(...fileParts)
        : path.join(TEST_ROOT, `src1/file1.${global.lang}`)
    )
  )
}

function getExportData(plugin) {
  return JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
}

function testSpyCall(context, call) {
  expect(call.args.map(p => p.replace(TEST_ROOT, 'absRoot'))).toMatchSnapshot(
    context
  )
}

module.exports = {
  getPlugin,
  openFile,
  getExportData,
  testSpyCall,
}
