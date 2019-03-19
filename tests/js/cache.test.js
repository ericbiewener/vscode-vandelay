const _ = require('lodash')
const { commands } = require('vscode')
const path = require('path')
const fs = require('fs')
const sinon = require('sinon')
const { getPlugin, openFile } = require('../utils')
require('../setup')

const cacheTest = async (context, config) => {
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  Object.assign(plugin, config)
  await commands.executeCommand('vandelay.cacheProject')
  const data = JSON.parse(fs.readFileSync(plugin.cacheFilePath, 'utf-8'))
  expect(data).toMatchSnapshot(context)
}

const testSpyCall = (context, call) =>
  expect(call.args.map(p => p.replace(TEST_ROOT, 'absRoot'))).toMatchSnapshot(
    context
  )

it('cacheProject', async function() {
  await cacheTest(this)
})

it('cacheProject - includePaths = [src2]', async function() {
  await cacheTest(this, {
    includePaths: [path.join(TEST_ROOT, 'src2')],
  })
})

it('cacheProject - excludePatterns = [src2]', async function() {
  await cacheTest(this, {
    excludePatterns: ['**/src2/*'],
  })
})

it('cacheProject - processDefaultName', async function() {
  const processDefaultName = sinon.fake(
    filepath => (filepath.endsWith('.js') ? 'DEFAULT' : null)
  )
  await cacheTest(this, { processDefaultName })
  testSpyCall(this, _.last(processDefaultName.getCalls()))
})

it('import - nonModulePaths', async function() {
  await cacheTest(this, { nonModulePaths: ['module1', 'module2'] })
})
