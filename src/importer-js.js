// TODO: to support importing when `require` is used rather than `import from`, look for the last line that has a
// `require` statement but no indentation. That ensures you aren't dealing with a local require
const {window, Range, Position} = require('vscode')
const path = require('path')
const _ = require('lodash')
const {parseCacheFile, trimPath, parseLineImportPath, strBetween} = require('./utils')
const {SETTINGS} = require('./settings')


const ExportType = {
  default: 0,
  named: 1,
  type: 2,
}

function readCacheFileJs(word) {
  const exportData = parseCacheFile('js', true)
  if (!exportData) return

  const S = SETTINGS.js
  const activeFilepath = window.activeTextEditor.document.fileName
  const items = []

  for (const importPath of Object.keys(exportData).sort()) {
    const absImportPath = path.join(S.projectRoot, importPath)
    if (absImportPath === activeFilepath) continue
    if (S.shouldIncludeImport && !S.shouldIncludeImport(path.join(S.projectRoot, importPath), activeFilepath)) {
      continue
    }
    
    const data = exportData[importPath]
    let defaultExport
    let namedExports
    let typeExports

    if (data.reexported) {
      if (data.default && !data.reexported.includes('default')) defaultExport = data.default
      if (data.named) namedExports = data.named.filter(exp => !data.reexported.includes(exp))
      if (data.types) typeExports = data.types.filter(exp => !data.reexported.includes(exp))
    } else {
      defaultExport = data.default
      namedExports = data.named
      typeExports = data.types
    }

    const ext = path.extname(importPath)
    const importPathNoExt = ext ? importPath.slice(0, -ext.length) : importPath

    if (defaultExport) {
      items.push({
        label: defaultExport,
        description: importPathNoExt,
        exportType: ExportType.default,
        isExtraImport: data.isExtraImport,
        absImportPath,
      })
    }

    if (namedExports) {
      namedExports.forEach(exportName => {
        items.push({
          label: exportName,
          description: importPathNoExt,
          exportType: ExportType.named,
          isExtraImport: data.isExtraImport,
          absImportPath,
        })
      })
    }

    if (typeExports) {
      typeExports.forEach(exportName => {
        items.push({
          label: exportName,
          description: importPathNoExt,
          exportType: ExportType.type,
          isExtraImport: data.isExtraImport,
          absImportPath,
        })
      })
    }
  }

  return items
}

/**
 * Determine which line number should get the import. This could be merged into that line if they have the same path
 * (resulting in lineIndexModifier = 0), or inserted as an entirely new import line before or after
 * (lineIndexModifier = -1 or 1)
 **/
function getLinePosition(importPath, isExtraImport, lines) {
  const S = SETTINGS.js

  const settingsPos = S.importOrderMap[importPath]
  const nonModulePathStarts = (S.absolutePaths || []).concat('.')
  
  let lineIndex
  let lineIndexModifier = 1

  let multiLineStart
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (multiLineStart != null) {
      if (!line.includes(' from ')) continue
    } else {
      if (!line.startsWith('import')) continue
      if (!line.includes(' from ')) {
        multiLineStart = i
        continue
      }
    }

    // Break once we find a line with the same path or a path that should be sorted later

    const linePath = parseLineImportPath(line)
    if (linePath === importPath) {
      lineIndex = i
      lineIndexModifier = 0
      break
    }

    const lineSettingsPos = S.importOrderMap[linePath]

    // If import exists in SETTINGS.importOrder
    if (settingsPos != null) {
      if (lineSettingsPos == null || lineSettingsPos > settingsPos) {
        lineIndex = i
        lineIndexModifier = -1
        break
      }
      else {
        lineIndex = i
        lineIndexModifier = 1
        continue
      }
    }
    
    // If import does not exist in SETTINGS.importOrder but line does
    if (lineSettingsPos != null) {
      lineIndex = i
      lineIndexModifier = 1
      continue
    }

    const lineIsNodeModule = !nonModulePathStarts.some(p => linePath.startsWith(p))

    // If import is a node module
    if (
      isExtraImport
      && (!lineIsNodeModule || importPath < linePath)
    ) {
      lineIndex = i
      lineIndexModifier = -1
      break
    }
    // If line is a node module but we didn't break above, then import must come after it
    if (lineIsNodeModule) {
      lineIndex = i
      lineIndexModifier = 1
      continue
    }

    const lineIsAbsolute = !linePath.startsWith('.')

    // If import is absolute path
    if (!importPath.startsWith('.')) {
      if (!lineIsAbsolute) {
        lineIndex = i
        lineIndexModifier = -1
        break
      }
    }
    else if (lineIsAbsolute) {
      lineIndex = i
      lineIndexModifier = 1
      continue
    }

    // No special sorting
    if (linePath > importPath) {
      lineIndex = i
      lineIndexModifier = -1
      break
    }

    lineIndex = i
  }

  const isFirstImportLine = lineIndex == null

  // If isFirstImportLine, find the first non-comment line.
  if (isFirstImportLine) {
    // If there is no line that doesn't start with a comment, we need lineIndexModifier to be 1.
    // It will get set back to 0 if a line without a comment is encountered (see end of for loop)
    lineIndexModifier = 1
    let isMultilineComment
    
    for (let i = 0; i < lines.length; i++) {
      // Don't use lineIndex as incrementor in for-loop declaration because it will get incremented one time too many
      lineIndex = i
      const line = lines[i]
      if (isMultilineComment) {
        if (line.includes('*/')) isMultilineComment = false
        continue
      }
      if (line.startsWith('/')) {
        if (line[1] === '*') isMultilineComment = true
        continue
      }
      lineIndexModifier = 0
      break
    }
  }

  return {lineIndex, lineIndexModifier, isFirstImportLine, multiLineStart}
}

async function insertImportJs({label: exportName, description: importPath, absImportPath, exportType, isExtraImport}) {
  const editor = window.activeTextEditor

  importPath = getFinalImportPath(importPath, absImportPath, isExtraImport)
  const lines = editor.document.getText().split('\n')
  
  const linePosition = getLinePosition(importPath, isExtraImport, lines)
  const {defaultImport, namedImports, typeImports} = getNewLineImports(lines, exportName, exportType, linePosition)
  const newLine = getNewLine(importPath, defaultImport, namedImports, typeImports)
  
  const {lineIndex, lineIndexModifier, multiLineStart} = linePosition
  
  await editor.edit(builder => {
    if (!lineIndexModifier) {
      builder.replace(new Range(multiLineStart || lineIndex, 0, lineIndex, lines[lineIndex].length), newLine)
    } else if (lineIndexModifier === 1) {
      builder.insert(new Position(lineIndex, lines[lineIndex].length), '\n' + newLine)
    } else {
      builder.insert(new Position(lineIndex, 0), newLine + '\n')
    }
  })
}

function getFinalImportPath(importPath, absImportPath, isExtraImport) {
  if (isExtraImport) return importPath

  const S = SETTINGS.js
  const activeFilepath = window.activeTextEditor.document.fileName
  importPath = getRelativeImportPath(activeFilepath, absImportPath)

  return S.processImportPath
    ? trimPath(S.processImportPath(importPath, absImportPath, activeFilepath, S.projectRoot) || importPath)
    : path.basename(importPath) === 'index.js'
      ? path.dirname(importPath)
      : trimPath(importPath)
}

function getNewLineImports(lines, exportName, exportType, linePosition) {
  const {lineIndex, lineIndexModifier, isFirstImportLine, multiLineStart} = linePosition
  let defaultImport = exportType === ExportType.default ? exportName : null
  const namedImports = exportType === ExportType.named ? [exportName] : []
  const typeImports = exportType === ExportType.type ? ['type ' + exportName] : []

  if (!lineIndexModifier && !isFirstImportLine) {
    const line = multiLineStart
      ? lines.slice(multiLineStart, lineIndex + 1).join(' ')
      : lines[lineIndex]
    
    const hasDefault = line[7] !== '{'
    if (exportType === ExportType.default) {
      if (hasDefault) return // default export already exists so bail out
    } else if (hasDefault) {
      defaultImport = strBetween(line, ' ').replace(',', '')
    }
    
    const nonDefaultImportText = strBetween(line, '{', '}')
    if (nonDefaultImportText) {
      nonDefaultImportText.split(',').forEach(item => {
        const trimmedItem = item.trim()
        if (trimmedItem.startsWith('type ')) {
          if (exportType === ExportType.type && trimmedItem === exportName) return
          typeImports.push(trimmedItem)
        } else {
          if (exportType === ExportType.named && trimmedItem === exportName) return
          namedImports.push(trimmedItem)
        }
      })
    }
  }

  return {defaultImport, namedImports, typeImports}
}

function getNewLine(importPath, defaultImport, namedImports, typeImports) {
  const S = SETTINGS.js
  namedImports.sort()
  typeImports.sort()
  const nonDefaultImports = namedImports.concat(typeImports)

  let newLineStart = 'import'
  if (defaultImport) newLineStart += ' ' + defaultImport

  let newLineMiddle = ''
  let newLineEnd = ''
  if (nonDefaultImports.length) {
    if (defaultImport) newLineStart += ','
    newLineStart += ' {'
    if (S.padCurlyBraces) newLineStart += ' '
    newLineMiddle = nonDefaultImports.join(', ')
    if (S.padCurlyBraces) newLineEnd += ' '
    newLineEnd += '}'
  }

  const quoteChar = S.quoteType === 'single' ? '\'' : '"'
  newLineEnd += ' from ' + quoteChar + importPath + quoteChar
  if (S.useSemicolons) newLineEnd += ';'

  // Split up line if necessary

  const {options} = window.activeTextEditor
  const tabChar = options.insertSpaces ? _.repeat(' ', options.tabSize) : '\t'
  const newLineLength = newLineStart.length + newLineMiddle.length + newLineEnd.length

  // If line is short enough OR there are no named/type imports, no need to split into multiline
  if (newLineLength <= S.maxImportLineLength || !nonDefaultImports.length) {
    return newLineStart + newLineMiddle + newLineEnd
  }

  if (S.multilineImportStyle === 'single') {
    // trim start & end to remove possible curly brace padding
    const final = newLineStart.trim()
      + '\n'
      + tabChar
      + nonDefaultImports.join(',\n' + tabChar)
      + (S.commaDangle ? ',' : '')
      + '\n'
      + newLineEnd.trim()

    return final
  }

  let line = newLineStart
  let fullText = ''

  nonDefaultImports.forEach((name, i) => {
    const isLast = i === nonDefaultImports.length - 1

    let newText = (i > 0 ? ' ' : '') + name
    if (!isLast) newText += ','

    const newLength = line.length + newText.length
    // If it's the last import, we need to make sure that the line end "from ..." text will also fit on the line before
    // appending the new import text.
    if (
      (!isLast && newLength <= S.maxImportLineLength)
      || (isLast && newLength + newLineEnd <= S.maxImportLineLength)
    ) {
      line += newText
    } else {
      const newLine = tabChar + newText
      fullText += line + '\n' + newLine
      line = newLine
    }
  })

  return fullText + newLineEnd
}

function getRelativeImportPath(file, absImportPath) {
  const relativePath = path.relative(path.dirname(file), absImportPath)
  return relativePath[0] === '.' ? relativePath : '.' + path.sep + relativePath
}

module.exports = {
  ExportType,
  readCacheFileJs,
  insertImportJs,
}
