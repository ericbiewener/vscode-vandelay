const { cacheTest } = require('../utils')

describe("Cache Tests", function() {

  it('cacheProject', async function() {
    await cacheTest(this)
  })

})
