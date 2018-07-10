const path = require('path')
const { window, Range, Position } = require('vscode')
const _ = require('lodash')

async function insertLine(newLine, importPosition) {
  const { match, indexModifier } = importPosition
  const editor = window.activeTextEditor
  const { document } = editor

  await editor.edit(builder => {
    if (!match) {
      builder.insert(new Position(0, 0), newLine + '\n')
    } else if (!indexModifier) {
      builder.replace(
        new Range(
          document.positionAt(match.start),
          document.positionAt(match.end)
        ),
        newLine
      )
    } else if (indexModifier === 1) {
      builder.insert(document.positionAt(match.end), '\n' + newLine)
    } else {
      // -1
      builder.insert(document.positionAt(match.start), newLine + '\n')
    }
  })
}

function getTabChar() {
  const { options } = window.activeTextEditor
  return options.insertSpaces ? _.repeat(' ', options.tabSize) : '\t'
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

function getLastInitialComment(text, commentRegex) {
  // Iterates over comment line matches. If one doesn't begin where the previous one left off, this means
  // a non comment line came between them.
  let expectedNextIndex = 0
  let match
  let prevMatch
  while ((match = commentRegex.exec(text))) {
    if (match.index !== expectedNextIndex) break
    expectedNextIndex = commentRegex.lastIndex + 1
    prevMatch = match
  }

  return prevMatch
}

module.exports = {
  insertLine,
  getTabChar,
  strUntil,
  removeExt,
  getLastInitialComment,
}
