const _ = require('lodash')
const { window, commands, Range } = require('vscode')
const path = require('path')
const expect = require('expect')
const sinon = require('sinon')
const {
  getPlugin,
  openFile,
  testSpyCall,
} = require('../utils')

sinon.stub(window, "showQuickPick")

afterEach(() => {
  window.showQuickPick.resetHistory()
})

function basenameNoExt(filepath) {
  return path.basename(filepath, path.extname(filepath));
}

async function buildImportItems() {
  await commands.executeCommand("vandelay.selectImport");
  const items = window.showQuickPick.args[0][0]
  return items
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

// TODO: ditch all top-level arraow functions. use normal function

async function insertItems(plugin, importItems) {
  for (const item of importItems) {
    window.showQuickPick.callsFake(() => Promise.resolve(item))
    await commands.executeCommand("vandelay.selectImport");
  }
  
  return window.activeTextEditor.document.getText()
}

async function insertTest(context, startingText, filepath) {
  context.timeout(1000 * 30)
  const open = () => (filepath ? openFile(filepath) : openFile())

  const [plugin] = await Promise.all([getPlugin(), open()])
  await replaceFileContents(startingText)
  
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

async function configInsertTest(context, config, reCache) {
  context.timeout(1000 * 30)
  if (reCache) await commands.executeCommand('vandelay.cacheProject')
  const [plugin] = await Promise.all([getPlugin(), openFile()])
  await replaceFileContents()
  Object.assign(plugin, config)
  const importItems = await buildImportItems()
  const result = await insertItems(plugin, importItems)
  expect(result).toMatchSnapshot(context)
}

/**
 * TESTS
 */

it('buildImportItems', async function() {
  await openFile()
  const items = await buildImportItems()
  for (const i of items) i.absImportPath = i.absImportPath.replace(TEST_ROOT, 'absRoot')
  expect(items).toMatchSnapshot(this)
})

it('import - empty', async function() {
  await insertTest(this)
})

it('import - has code', async function() {
  await insertTest(
    this,
    `const foo = 1
`
  )
})

it('import - single line comment', async function() {
  await insertTest(
    this,
    `// I'm a comment
`
  )
})

it('import - multiline comment', async function() {
  await insertTest(
    this,
    `/*
I'm a comment
With multiple lines
*/
`
  )
})

it('import - comment with code right after', async function() {
  await insertTest(
    this,
    `// I'm a comment
const foo = 1
`
  )
})

it('import - comment with linebreak and code', async function() {
  await insertTest(
    this,
    `// I'm a comment

const foo = 1
`
  )
})

it('import - src1/subdir/file1.js', async function() {
  await insertTest(this, '', path.join(TEST_ROOT, 'src1/subdir/file1.js'))
})

it('import - src2/file1.js', async function() {
  await insertTest(this, '', path.join(TEST_ROOT, 'src2/file1.js'))
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
