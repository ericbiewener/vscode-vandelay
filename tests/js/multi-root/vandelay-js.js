const path = require('path')

const src1 = path.join(__dirname, 'src1')
const src2 = path.join(__dirname, 'src2')
const src3 = path.join(__dirname, 'src3')

module.exports = {
  includePaths: [
    src1,
    src2,
    src3,
  ],
  nonModulePaths: ['src3'],
}
