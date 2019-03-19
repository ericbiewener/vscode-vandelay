const path = require('path')
const { window, workspace, extensions, Uri } = require('vscode')

const getPlugin = async () => {
  const api = await extensions.getExtension('edb.vandelay').activate()
  return api._test.plugins[global.lang]
}

const openFile = (...fileParts) =>
  window.showTextDocument(
    Uri.file(
      fileParts.length
        ? path.join(...fileParts)
        : path.join(TEST_ROOT, `src1/file1.${global.lang}`)
    )
  )

module.exports = {
  getPlugin,
  openFile,
}
