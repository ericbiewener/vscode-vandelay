const _ = require('lodash')
const { window, commands, Range } = require('vscode')
const path = require('path')
const { importTests } = require('../shared-tests')
const {
  getPlugin,
  openFile,
  testSpyCall,
  buildImportItems,
  saveFile,
  insertTest,
  insertDiffTest,
  configInsertTest,
  configInsertDiffTest,
} = require('../utils')

function basenameNoExt(filepath) {
  return path.basename(filepath, path.extname(filepath));
}

describe("Import Tests", function() {

  importTests()

  it('import - has code', async function() {
    await insertDiffTest(
      this,
    `const foo = 1
`
    )
  })

  it('import - single line comment', async function() {
    await insertDiffTest(
      this,
    `// I'm a comment
`
    )
  })

  it('import - multiline comment', async function() {
    await insertDiffTest(
      this,
    `/*
I'm a comment
With multiple lines
*/
`
    )
  })

  it('import - comment with code right after', async function() {
    await insertDiffTest(
      this,
    `// I'm a comment
const foo = 1
`
    )
  })

  it('import - comment with linebreak and code', async function() {
    await insertDiffTest(
      this,
    `// I'm a comment

const foo = 1
`
    )
  })

  it('import - src1/subdir/file1.js', async function() {
    await insertTest(this, '', 'src1/subdir/file1.js')
  })

  it('import - src2/file1.js', async function() {
    await insertTest(this, '', 'src2/file1.js')
  })

  it('import - importGroups', async function() {
    await configInsertTest(this, { importGroups: ['module4', 'module2'] })
  })

  it('import - maxImportLineLength', async function() {
    // Length of 45 needed to test lines that come up right against the limit
    await configInsertTest(this, { maxImportLineLength: 45 })
  })

  it('import - padCurlyBraces = false', async function() {
    await configInsertTest(this, { padCurlyBraces: false })
  })

  it('import - useSingleQuotes = false', async function() {
    await configInsertTest(this, { useSingleQuotes: false })
  })

  it('import - useSemicolons = false', async function() {
    await configInsertTest(this, { useSemicolons: false })
  })

  it('import - multilineImportStyle = single', async function() {
    await configInsertTest(this, { multilineImportStyle: 'single' })
  })

  it('import - trailingComma = false', async function() {
    await configInsertTest(this, {
      multilineImportStyle: 'single',
      trailingComma: false,
    })
  })

  it('import - processImportPath', async function() {
    const processImportPath = sinon.fake(
      importPath =>
        importPath.endsWith('file1.js')
          ? importPath.replace('file', 'FILE')
          : null
    )
    await configInsertTest(this, { processImportPath })
    testSpyCall(this, processImportPath.getCall(0))
  })

  it('import - nonModulePaths', async function() {
    await configInsertTest(
      this,
      {
        processImportPath: importPath =>
          importPath.endsWith('file2.js') || importPath.endsWith('file3.js')
            ? basenameNoExt(importPath)
            : null,
        nonModulePaths: ['file2', 'file3'],
      },
      true
    )
  })

  it('import - shouldIncludeImport', async function() {
    const shouldIncludeImport = sinon.fake(absImportPath =>
      absImportPath.endsWith('file1.js')
    )
    await configInsertTest(this, { shouldIncludeImport })
    testSpyCall(this, _.last(shouldIncludeImport.getCalls()))
  })

  if (process.env.TEST_PROJECT !== 'es5') {
    it('import - preferTypeOutside = true', async function() {
      await configInsertTest(this, { preferTypeOutside: true })
    })
  }
})
