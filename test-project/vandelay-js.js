const path = require('path')

module.exports = {
  multilineImportStyle: 'single',
  commaDangle: true,
  importOrder: ['react', 'react-dom'],
  includePaths: [
    path.join(__dirname, 'src'),
    path.join(__dirname, 'other-src'),
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
  }
}
