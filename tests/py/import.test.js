const expect = require('expect')
const path = require('path')
const { buildImportItems } = require('../src/importing/importer')
const {
  configInsertTest,
  getExportData,
  getPlugin,
  insertTest,
  openFile,
  testRoot,
} = require('./utils')

it('buildImportItems', async function() {
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  const data = getExportData(plugin)
  data['src2/file1.py'].cached = Date.now()
  const items = plugin._test.getImportItems(plugin, data, buildImportItems)
  expect(items).toMatchSnapshot(this)
})

it('import - empty', async function() {
  await insertTest(this)
})

it('import - has code', async function() {
  await insertTest(
    this,
    `def foo():
    pass
`
  )
})

it('import - single line comment', async function() {
  await insertTest(
    this,
    `# I'm a comment
`
  )
})

it('import - multiline comment', async function() {
  await insertTest(
    this,
    `"""I'm a comment
    With multiple lines
""" 
`
  )
})

it('import - comment with code right after', async function() {
  await insertTest(
    this,
    `# I'm a comment
def foo():
    pass    
`
  )
})

it('import - comment with linebreak and code', async function() {
  await insertTest(
    this,
    `# I'm a comment

def foo():
    pass
`
  )
})

it('import - src1/subdir/file1.js', async function() {
  await insertTest(this, '', path.join(testRoot, 'src1/subdir/file1.py'))
})

it('import - importGroups', async function() {
  await configInsertTest(this, { importGroups: null })
})

it('import - maxImportLineLength', async function() {
  // Length of 46 needed to test lines that come up right against the limit
  await configInsertTest(this, { maxImportLineLength: 46 })
})

it('import - processImportPath', async function() {
  // By changing the name of this importPath, we break its grouping with `src2`. This is the correct
  // result. Up to the user to fix the value in `importGroups`
  await configInsertTest(this, {
    processImportPath: importPath => importPath.replace('src1', 'SRC1'),
  })
})

it('import - shouldIncludeImport', async function() {
  await configInsertTest(this, {
    shouldIncludeImport: absImportPath => absImportPath.includes('src2'),
  })
})
