/* eslint-ignore */
const path = require('path')
import { Configuration } from 'webpack'

const SRC = path.join(__dirname, 'src')
const DIST = path.join(__dirname, 'dist')

const config: Configuration = {
  mode: process.env.NODE_ENV as 'development' | 'production',
  target: 'node',
  entry: {
    extension: path.join(SRC, 'main.ts'),
    cacheNodeModulesSandbox: path.join(SRC, 'plugins/javascript/cacheNodeModules/cacheNodeModulesSandbox.ts')
  },
  output: {
    path: DIST,
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
    ],
  },
}

module.exports = config
