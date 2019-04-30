const { window } = require('vscode')
const { importTests } = require('../shared-tests')
const {
  insertTest,
  insertDiffTest,
  configInsertTest,
  configInsertDiffTest,
  openFile,
  insertItem,
} = require('../utils')
const snapshotDiff = require('snapshot-diff')
const { sleep} = require('utlz')

describe('Import Tests', function() {
  importTests()

  it('import - has code', async function() {
    await insertDiffTest(
      this,
      `def foo():
    pass
`
    )
  })

  it('import - single line comment', async function() {
    await insertDiffTest(
      this,
      `# I'm a comment
`
    )
  })

  it('import - multiline comment', async function() {
    await insertDiffTest(
      this,
      `"""I'm a comment
    With multiple lines
""" 
`
    )
  })

  it('import - comment with code right after', async function() {
    await insertDiffTest(
      this,
      `# I'm a comment
def foo():
    pass    
`
    )
  })

  it('import - comment with linebreak and code', async function() {
    await insertDiffTest(
      this,
      `# I'm a comment

def foo():
    pass
`
    )
  })

  it('import - src1/file1.js - preserve file', async function() {
    await insertTest(this, '', 'src1/file1.py', true)
  })

  it('import - src1/subdir/file1.js', async function() {
    await insertTest(this, '', 'src1/subdir/file1.py')
  })

  it('import - importGroups', async function() {
    await configInsertTest(this, { importGroups: null })
  })

  it('import - maxImportLineLength', async function() {
    // Length of 46 needed to test lines that come up right against the limit
    await configInsertDiffTest(this, { maxImportLineLength: 46 })
  })

  it('import - processImportPath', async function() {
    // By changing the name of this importPath, we break its grouping with `src2`. This is the correct
    // result. Up to the user to fix the value in `importGroups`
    await configInsertDiffTest(this, {
      processImportPath: importPath => importPath.replace('src1', 'SRC1'),
    })
  })

  it('import - processImportName', async function() {
    await configInsertDiffTest(this, {
      processImportName: importName => {
        return importName === 'package3_file1_1'
          ? 'package3_file1_1 as package3_file1_1_renamed'
          : null
      },
    })
  })

  it('import - shouldIncludeImport', async function() {
    await configInsertTest(this, {
      shouldIncludeImport: absImportPath => absImportPath.includes('src2'),
    })
  })

  it('import already exists', async () => {
    await openFile()
    await insertItem({ label: 'package3_file1_2', description: 'package3', isExtraImport: true })
    expect(window.showWarningMessage.callCount).toBe(1)

    window.showWarningMessage.resetHistory()
    await insertItem({ label: 'package3_file1_2 as package3_file1_2_RENAMED', description: 'package3', isExtraImport: true })
    expect(window.showWarningMessage.callCount).toBe(1)

    window.showWarningMessage.resetHistory()
    await insertItem({ label: 'package3_file1_1 as package3_file1_1_renamed', description: 'package3', isExtraImport: true })
    expect(window.showWarningMessage.callCount).toBe(1)

    window.showWarningMessage.resetHistory()
    await insertItem({ label: 'package3_file1_1', description: 'package3', isExtraImport: true })
    expect(window.showWarningMessage.callCount).toBe(0)
    
    window.showWarningMessage.resetHistory()
    await insertItem({ label: 'package3_file1_2 as package3_file1_2_renamed', description: 'package3', isExtraImport: true })
    expect(window.showWarningMessage.callCount).toBe(0)
  })
})
