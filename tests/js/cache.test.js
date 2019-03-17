const _ = require('lodash')
const path = require('path')
const sinon = require('sinon')
const { cacheTest, testRoot, testSpyCall } = require('./utils')

it('cacheProject', async function() {
  await cacheTest(this)
})

it('cacheProject - includePaths = [src2]', async function() {
  await cacheTest(this, {
    includePaths: [path.join(testRoot, 'src2')],
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
