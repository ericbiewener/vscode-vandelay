const path = require('path')
const jest = require('jest-snapshot')
const expect = require('expect')

let initialized
let snapshotState
let matcher

function toMatchSnapshot(received, { test }, currentTestName) {
  if (!initialized) {
    // Lazy initaialization: if imported into test/index.js, afterEach global will not be available yet
    afterEach(() => {
      if (!snapshotState) return
      snapshotState.save()
      snapshotState = null
      matcher = null
    })
  }

  if (!snapshotState) {
    snapshotState = new jest.SnapshotState(test.file, {
      updateSnapshot: process.env.UPDATE_SNAPSHOT ? 'all' : 'new',
      snapshotPath: path.join(
        path.dirname(test.file),
        process.env.TEST_PROJECT,
        '__snapshots__',
        path.basename(test.file) + '.snap'
      ),
    })
  }

  // bind because toMatchSnapshot accesses snapshotState & currentTestName via `this`
  matcher = jest.toMatchSnapshot.bind({
    snapshotState,
    currentTestName,
  })

  const result = matcher(received)

  return { result, snapshotState }
}

expect.extend({
  toMatchSnapshot(received, context, title) {
    const { parent } = context.test
    let currentTestName = parent && parent.title ? `${parent.title} | ` : ''
    currentTestName += context.test.title
    if (title) currentTestName += ` - ${title}`
    const { result, snapshotState } = toMatchSnapshot(
      received,
      context,
      currentTestName
    )

    if (!result.pass) {
      console.log(result.report())
    } else if (snapshotState.updated) {
      console.log(`Updated ${currentTestName}`)
    }
    expect(result.pass).toBe(true)
    return result
  },
})
