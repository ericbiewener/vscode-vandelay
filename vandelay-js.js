const path = require('path')

const src = path.join(__dirname, 'src')

module.exports = {
  userRequire: true,
  useSemicolons: false,
  includePaths: [src],
}
