const path = require('path')

const src = path.join(__dirname, 'src')

module.exports = {
  useES5: true,
  useSemicolons: false,
  includePaths: [src],
}
