const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const { sleep } = require('utlz')
const {
  window,
  Range,
  workspace,
  extensions,
  Uri,
  commands,
} = require('vscode')
const snapshotDiff = require('snapshot-diff')

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
  const data = JSON.parlse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
  expect(data).toMatchSnapshot(context)
}

async function buildImportItems() {
  await commands.executeCommand('vandelay.selectImport')
  const items = _.last(window.showQuickPick.args)[0]
  return items
}

async function saveFile(filepath) {
  await openFile(filepath)
  await commands.executeCommand('workbench.action.files.save')
  return await sleep(1000) // Previous command file watcher won't have completed yet
}

function replaceFileContents(newText = '') {
  const editor = window.activeTextEditor
  return editor.edit(builder => {
    builder.replace(
      editor.document.validateRange(new Range(0, 0, 9999999999, 0)),
      newText
    )
  })
}

async function insertItems(plugin, importItems) {
  for (const item of importItems) {
    window.showQuickPick.callsFake(() => Promise.resolve(item))
    await commands.executeCommand('vandelay.selectImport')
  }

  return window.activeTextEditor.document.getText()
}

async function insertTest(
  context,
  startingText,
  filepath,
  preserveFileContents
) {
  const open = () => (filepath ? openFile(filepath) : openFile())

  const [plugin] = await Promise.all([getPlugin(), open()])
  if (!preserveFileContents) await replaceFileContents(startingText)

  let importItems = await buildImportItems()

  const originalResult = await insertItems(plugin, importItems)
  expect(originalResult).toMatchSnapshot(context, 'original order')

  if (process.env.FULL_INSERT_TEST) {
    for (let i = 0; i < 5; i++) {
      await replaceFileContents(startingText)
      importItems = _.shuffle(importItems)
      const newResult = await insertItems(plugin, importItems)
      if (newResult !== originalResult) {
        console.log(`\n\n${JSON.stringify(importItems)}\n\n`)
      }
      expect(newResult).toBe(originalResult)
    }
  }
}

async function configInsertDiffTest(context, config) {
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  await replaceFileContents()

  if (!this.noConfig) {
    // Cache for faster test running
    const importItems = await buildImportItems()
    this.noConfig = await insertItems(plugin, importItems)
    await replaceFileContents()
  }

  Object.assign(plugin, config)
  const importItems = await buildImportItems()
  const withConfig = await insertItems(plugin, importItems)
  expect(
    snapshotDiff(this.noConfig, withConfig, {
      aAnnotation: 'No Config',
      bAnnotation: 'With Config',
      contextLines: 0,
    })
  ).toMatchSnapshot(context)
}

async function configInsertTest(context, config, reCache) {
  if (reCache) await commands.executeCommand('vandelay.cacheProject')
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  await replaceFileContents()
  Object.assign(plugin, config)
  const importItems = await buildImportItems()
  const result = await insertItems(plugin, importItems)
  expect(result).toMatchSnapshot(context)
}

module.exports = {
  getPlugin,
  openFile,
  getExportData,
  testSpyCall,
  cacheTest,
  buildImportItems,
  saveFile,
  insertTest,
  configInsertTest,
  configInsertDiffTest,
}
