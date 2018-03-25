const fs = require('fs-extra')
const path = require('path')
const _ = require('lodash')
const {getSettings} = require('./settings')
const {INDEX_JS} = require('./constants')
const babylonParse = require('./babylonParse')
const {trimPath} = require('./utils')
const {getFilepathKey} = require('./cacher')

const S = getSettings('js')

function cacheJsFile(filepath, data = {}) {
  const ats = babylonParse(fs.readFileSync(filepath, 'utf8'), filepath)
  if (!ats) return
  const exp = {}

  ats.program.body.forEach(node => {

    if (node.type === 'ExportDefaultDeclaration') {
      if (filepath.endsWith(INDEX_JS)) {
        exp.default = trimPath(path.dirname(filepath), true)
      } else {
        if (S.processDefaultName) {
          const name = S.processDefaultName(filepath)
          if (name) exp.default = name
        }
        if (!exp.default) exp.default = trimPath(filepath, true)
      }
    }
    // NAMED OR TYPES
    else if (node.type === 'ExportNamedDeclaration') {
      const dec = node.declaration

      // NAMED
      if (node.exportKind === 'value') {
        if (!exp.named) exp.named = []
        if (dec) {
          // export const a = 1
          if (dec.id) {
            exp.named.push(dec.id.name)
          }
          // export const a = 1, b = 2
          else {
            exp.named.push(...dec.declarations.map(n => n.id.name))
          }
        }
        // export { default as someName, otherName } from ".."
        else {
          processReexportNode(exp, exp.named, node)
        }
      }
      // TYPES
      else {
        if (!exp.types) exp.types = []
        if (dec) {
          exp.types.push(dec.id.name)
        } else {
          processReexportNode(exp, exp.types, node)
        }
      }
    }
    // export * from ".."
    else if (node.type === 'ExportAllDeclaration') {
      if (!exp.all) exp.all = []
      exp.all.push(node.source.value)
    }
  })

  if (!_.isEmpty(exp)) data[getFilepathKey(filepath)] = exp

  return data
}

function processReexportNode(exp, exportArray, node) {
  exportArray.push(...node.specifiers.map(n => n.exported.name))

  if (!exp.reexports) exp.reexports = {}
  const subfilepath = node.source.value
  if (!exp.reexports[subfilepath]) exp.reexports[subfilepath] = []
  // `local.name` is the name of the export in the subfile. e.g. `{ default as something }` will be `default`,
  // { something as somethingElse } will be `something`.
  exp.reexports[subfilepath].push(...node.specifiers.map(n => n.local.name))
}

function processReexports(data) {
  const indexChecks = {}

  _.each(data, (fileData, mainFilepath) => {
    if (fileData.all) {
      fileData.all.forEach(filename => {
        const subfileExports = getSubfileData(mainFilepath, filename, data)
        if (!subfileExports || !subfileExports.named) return
        if (fileData.named) {
          fileData.named.push(...subfileExports.named)
        } else {
          fileData.named = subfileExports.named
        }
        subfileExports.reexported = subfileExports.named
      })

      delete fileData.all
    }

    if (fileData.reexports) {
      _.each(fileData.reexports, (exportNames, filename) => {
        const subfileExports = getSubfileData(mainFilepath, filename, data)
        if (subfileExports) {
          if (!subfileExports.reexported) subfileExports.reexported = []
          subfileExports.reexported.push(...exportNames)
        }
      })

      delete fileData.reexports
    }

    /**
     * Track whether index file exports have subfiles with valid exports. For example, an index file that exports things
     * only from files with ignored filename patterns will need to be deleted from `data`
     */
    const dir = path.dirname(mainFilepath)

    if (mainFilepath.endsWith(INDEX_JS)) {
      if (!indexChecks[dir]) indexChecks[dir] = false
    } else {
      indexChecks[dir] = true
    }
  })

  _.each(indexChecks, (hasExports, dir) => {
    if (!hasExports) delete data[path.join(dir, INDEX_JS)]
  })

  return data
}

function getSubfileData(mainFilepath, filename, data) {
  const filepathNoExt = path.resolve(path.dirname(mainFilepath), filename)
  for (const ext of ['js', 'jsx']) {
    const subfileExports = data[filepathNoExt + ext]
    if (subfileExports) return subfileExports
  }
}

module.exports = {
  cacheJsFile,
  processReexports,
}
