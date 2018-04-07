const path = require('path')

const absoluteSrc = path.join(__dirname, 'absolute-src')

module.exports = {
  multilineImportStyle: 'single',
  commaDangle: true,
  importOrder: ['react', 'react-dom', 'redux', 'react-redux'],
  absolutePaths: ['absolute-src'],
  includePaths: [
    path.join(__dirname, 'src'),
    path.join(__dirname, 'other-src'),
    absoluteSrc,
  ],
  excludePatterns: [
    /.*__tests__.*/,
  ],
  extraImports: {
    react: {
      default: 'React',
      named: ['Component'],
      types: ['ComponentType', 'Node', 'Element']
    },
    'react-dom': {
      default: 'ReactDOM'
    },
    'another': {
      default: 'another'
    },
  },
  processDefaultName: (filePath) => {
    if (filePath.endsWith('file1.js')) return 'file1_renamed'
  },
  shouldIncludeImport: (absImportPath, activeFilepath) => {
    return absImportPath.startsWith(absoluteSrc) || !activeFilepath.startsWith(absoluteSrc)
  },
  processImportPath: (importPath, absImportPath, activeFilepath) => {
    if (!absImportPath.startsWith(absoluteSrc)) return
    if (activeFilepath.startsWith(absoluteSrc)) return
    return absImportPath.slice(__dirname.length + 1)
  },
}
