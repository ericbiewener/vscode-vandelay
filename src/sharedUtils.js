const path = require('path')
const {window, Range, Position} = require('vscode')
const _ = require('lodash')

async function insertLine(newLine, importPosition) {
  const {match, indexModifier} = importPosition
  const editor = window.activeTextEditor
  const {document} = editor

  await editor.edit(builder => {
    if (!match) {
      builder.insert(new Position(0, 0), newLine + '\n')
    } else if (!indexModifier) {
      builder.replace(
        new Range(
          document.positionAt(match.start),
          document.positionAt(match.end - 1)
        ),
        newLine
      )
    } else if (indexModifier === 1) {
      builder.insert(document.positionAt(match.end - 1), '\n' + newLine)
    } else {
      // -1
      builder.insert(document.positionAt(match.start), newLine + '\n')
    }
  })
}

function getTabChar() {
  const {options} = window.activeTextEditor
  return options.insertSpaces ? _.repeat(' ', options.tabSize) : '\t'
}

function strBetween(str, startChar, endChar) {
  const start =
    typeof startChar === 'string'
      ? str.indexOf(startChar)
      : str.search(startChar)
  if (start < 0) return

  const substr = str.slice(start + 1)

  endChar = endChar || startChar
  const end =
    typeof endChar === 'string'
      ? substr.indexOf(endChar || startChar)
      : substr.search(endChar || startChar)

  return end < 0 ? substr : substr.slice(0, end)
}

function strUntil(str, endChar) {
  const index =
    typeof endChar === 'string' ? str.indexOf(endChar) : str.search(endChar)
  return index < 0 ? str : str.slice(0, index)
}

function removeExt(filepath) {
  const ext = path.extname(filepath)
  return ext ? filepath.slice(0, -ext.length) : filepath
}

module.exports = {
  insertLine,
  getTabChar,
  strBetween,
  strUntil,
  removeExt
}
