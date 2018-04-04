const _ = require('lodash')
const {initializeSettings} = require('../settings')
const utils = require('../utils')

utils.writeCacheFile = jest.fn()

test('cacheProject', async () => {
  const {cacheProject} = require('../cacher')
  
  initializeSettings()
  await cacheProject()
  expect(utils.writeCacheFile.mock.calls).toMatchSnapshot()
})
