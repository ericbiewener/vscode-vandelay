// const _ = require('lodash')
// const path = require('path')
// const expect = require('expect')
// const sinon = require('sinon')
// const { buildTypeImportItems } = require('../src/importing/buildImportItems')
// const { buildImportItems } = require('../src/importing/importer')
// const { basename } = require('../src/utils')
// const {
//   configInsertTest,
//   getExportData,
//   getPlugin,
//   insertTest,
//   openFile,
//   testRoot,
//   testSpyCall,
// } = require('./utils')

// it('buildImportItems', async function() {
//   const [plugin] = await Promise.all([getPlugin(), openFile()])
//   const data = getExportData(plugin)
//   data['src2/file1.js'].cached = Date.now()
//   let items = plugin._test.getImportItems(plugin, data, buildImportItems)
//   expect(items).toMatchSnapshot(this)

//   // reexports should differ
//   await openFile(testRoot, 'src2/file1.js')
//   items = plugin._test.getImportItems(plugin, data, buildImportItems)
//   expect(items).toMatchSnapshot(this)
// })

// it('buildTypeImportItems', async function() {
//   const [plugin] = await Promise.all([getPlugin(), openFile()])
//   const data = getExportData(plugin)
//   const items = plugin._test.getImportItems(plugin, data, buildTypeImportItems)
//   expect(items).toMatchSnapshot(this)
// })

// it('import - empty', async function() {
//   await insertTest(this)
// })

// it('import - has code', async function() {
//   await insertTest(
//     this,
//     `const foo = 1
// `
//   )
// })

// it('import - single line comment', async function() {
//   await insertTest(
//     this,
//     `// I'm a comment
// `
//   )
// })

// it('import - multiline comment', async function() {
//   await insertTest(
//     this,
//     `/*
// I'm a comment
// With multiple lines
// */
// `
//   )
// })

// it('import - comment with code right after', async function() {
//   await insertTest(
//     this,
//     `// I'm a comment
// const foo = 1
// `
//   )
// })

// it('import - comment with linebreak and code', async function() {
//   await insertTest(
//     this,
//     `// I'm a comment

// const foo = 1
// `
//   )
// })

// it('import - src1/subdir/file1.js', async function() {
//   await insertTest(this, '', path.join(testRoot, 'src1/subdir/file1.js'))
// })

// it('import - src2/file1.js', async function() {
//   await insertTest(this, '', path.join(testRoot, 'src2/file1.js'))
// })

// it('import - importGroups', async function() {
//   await configInsertTest(this, { importGroups: ['module4', 'module2'] })
// })

// it('import - maxImportLineLength', async function() {
//   // Length of 45 needed to test lines that come up right against the limit
//   await configInsertTest(this, { maxImportLineLength: 45 })
// })

// it('import - padCurlyBraces = false', async function() {
//   await configInsertTest(this, { padCurlyBraces: false })
// })

// it('import - useSingleQuotes = false', async function() {
//   await configInsertTest(this, { useSingleQuotes: false })
// })

// it('import - useSemicolons = false', async function() {
//   await configInsertTest(this, { useSemicolons: false })
// })

// it('import - multilineImportStyle = single', async function() {
//   await configInsertTest(this, { multilineImportStyle: 'single' })
// })

// it('import - trailingComma = false', async function() {
//   await configInsertTest(this, {
//     multilineImportStyle: 'single',
//     trailingComma: false,
//   })
// })

// it('import - processImportPath', async function() {
//   const processImportPath = sinon.fake(
//     importPath =>
//       importPath.endsWith('file1.js')
//         ? importPath.replace('file', 'FILE')
//         : null
//   )
//   await configInsertTest(this, { processImportPath })
//   testSpyCall(this, processImportPath.getCall(0))
// })

// it('import - nonModulePaths', async function() {
//   await configInsertTest(
//     this,
//     {
//       processImportPath: importPath =>
//         importPath.endsWith('file2.js') || importPath.endsWith('file3.js')
//           ? basename(importPath)
//           : null,
//       nonModulePaths: ['file2', 'file3'],
//     },
//     true
//   )
// })

// it('import - shouldIncludeImport', async function() {
//   const shouldIncludeImport = sinon.fake(absImportPath =>
//     absImportPath.endsWith('file1.js')
//   )
//   await configInsertTest(this, { shouldIncludeImport })
//   testSpyCall(this, _.last(shouldIncludeImport.getCalls()))
// })

// if (process.env.TEST_PROJECT !== 'es5') {
//   it('import - preferTypeOutside = true', async function() {
//     await configInsertTest(this, { preferTypeOutside: true })
//   })
// }
