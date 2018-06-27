const path = require('path')
const {window, Range, Position} = require('vscode')
const _ = require('lodash')

async function insertLine(newLine, linePosition, lines) {
  const {start, lineIndexModifier, isFirstImportLine} = linePosition
  const end = linePosition.end || start
  
  await window.activeTextEditor.edit(builder => {
    if (!lineIndexModifier) {
      builder.replace(new Range(start, 0, end, lines[end].length), newLine)
    } else if (lineIndexModifier === 1) {
      builder.insert(new Position(end, lines[end].length), '\n' + newLine)
    } else { // -1
      // If it's the first import line, then add an extra new line between it and the subsequent non-import code.
      // We only need to worry about this here, because if `isFirstImportLine` = true, the only alternative
      // `lineIndexModifier` is 1, which occurs when the file only has comments
      const extraNewLine = isFirstImportLine ? '\n' : ''
      builder.insert(new Position(end, 0), newLine + '\n' + extraNewLine)
    }
  })
}

function getTabChar() {
  const {options} = window.activeTextEditor
  return options.insertSpaces ? _.repeat(' ', options.tabSize) : '\t'
}

function strBetween(str, startChar, endChar) {
  const start = typeof startChar === 'string'
    ? str.indexOf(startChar)
    : str.search(startChar)
  if (start < 0) return
  
  const substr = str.slice(start + 1)
  
  endChar = endChar || startChar
  const end = typeof endChar === 'string'
    ? substr.indexOf(endChar || startChar)
    : substr.search(endChar || startChar)
  
  return end < 0 ? substr : substr.slice(0, end)
}

function strUntil(str, endChar) {
  const index = typeof endChar === 'string'
    ? str.indexOf(endChar)
    : str.search(endChar)
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
  removeExt,
}
