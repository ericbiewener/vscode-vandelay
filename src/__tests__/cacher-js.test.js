const path = require('path')
const {cacheJsFile, processReexports, _test} = require('../cacher-js')
const {initializeSettings} = require('../settings.js')

initializeSettings()

const {processReexportNode, getSubfileData} = _test

const filePath = path.join(__dirname, '../../test-project/src/file1.js')

test('cacheJsFile', () => {
  const data = cacheJsFile(filePath)
  expect(data).toMatchSnapshot()
})

test('processReexportNode', () => {
  const lines = [
    'export {one} from "../somewhere/else"',
    'export { one  } from \'../somewhere/else\'; ',
  ]
  lines.forEach(line => {
    const fileExports = {}
    const exportArray = []
    processReexportNode(fileExports, exportArray, line)
    expect(fileExports.reexports['../somewhere/else']).toEqual(['one'])
    expect(exportArray).toEqual(['one'])
  })

  const fileExports = {}
  const exportArray = []
  const line = 'export {three, two as two2,   one} from "../somewhere/else"'
  processReexportNode(fileExports, exportArray, line)
  expect(fileExports.reexports['../somewhere/else']).toEqual(['three', 'two', 'one'])
  expect(exportArray).toEqual(['three', 'two2', 'one'])
})

test('processReexports', () => {
  const data = {
    '/src/file1.js': {
      default: 'file1',
      named: [
        'var1',
        'var2',
        'var3',
        'fn',
        'Something',
        'varDeclaredEarlier',
        'varDeclaredEarlierWithSemiColon',
        'subdir2_file1_var1',
        'subdir2_file1_var2_renamed',
        'subdir2_file2_var1_renamed',
        'subdir2_file2_var2',
      ],
      types: [
        'MyType1',
        'MyType2',
      ],
      all: [
        './subdir1/file1',
        './subdir1/file2',
        './subdir1/fileWithNoNamedExports',
        './subdir1/nonexistentFile',
      ],
      reexports: {
        './subdir2/file1': [
          'subdir2_file1_var1',
          'subdir2_file1_var2',
        ],
        './subdir2/file2': [
          'subdir2_file2_var1',
          'subdir2_file2_var2',
        ]
      }
    },
    '/src/subdir1/file1.js': {
      named: ['subdir1_file1_var1', 'subdir1_file1_var2']
    },
    '/src/subdir1/file2.jsx': {
      named: ['subdir1_file2_var1']
    },
    '/src/subdir1/fileWithNoNamedExports.js': {
      default: 'fileWithNoNamedExports'
    },
    '/src/subdir2/file1.js': {
      reexported: ['preexisting_reexport_1', 'preexisting_reexport_2']
    },
    '/src/subdir2/file2.jsx': {},
  }

  processReexports(data)
  expect(data).toMatchSnapshot()
})

test('getSubfileData', () => {
  let data = {'/src/subdir1/file1.js': 1}
  expect(getSubfileData('/src/file1', './subdir1/file1', data)).toBe(1)
  data = {'/src/subdir1/file1.jsx': 2}
  expect(getSubfileData('/src/file1', './subdir1/file1', data)).toBe(2)
})
