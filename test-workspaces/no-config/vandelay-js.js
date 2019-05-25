const path = require('path')

/**
 * Configuration file for VS Code Vandelay extension.
 * https://github.com/ericbiewener/vscode-vandelay#configuration
 */

module.exports = {
  // This is the only required property. At least one path must be included.
  includePaths: [
    path.join(__dirname, 'src1'),
    path.join(__dirname, 'src2'),
    path.join(__dirname, 'src3'),
  ],
}
