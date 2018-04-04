// TODO: to support importing when `require` is used rather than `import from`, look for the last line that has a
// `require` statement but no indentation. That ensures you aren't dealing with a local require
const {window, Range, Position} = require('vscode')
const path = require('path')
const _ = require('lodash')
const {parseCacheFile, trimPath, parseLineImportPath, strBetween} = require('./utils')
const {SETTINGS} = require('./settings')
const {MultilineImportStyle, LineModifier} = require('./constants')


const ExportType = {
  default: 0,
  named: 1,
  type: 2,
}

function readCacheFileJs() {
  const exportData = parseCacheFile('js', true)
  if (!exportData) return

  const S = SETTINGS.js
  const activeFilepath = window.activeTextEditor.document.fileName
  const items = []

  for (const importPath of Object.keys(exportData).sort()) {
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

    if (defaultExport) {
      const exportName = defaultExport

      items.push({
        label: defaultExport,
        description: importPath,
        exportType: ExportType.default,
        isExtraImport: data.isExtraImport,
      })
    }

    if (namedExports) {
      namedExports.forEach(exportName => {
        items.push({
          label: exportName,
          description: importPath,
          exportType: ExportType.named,
          isExtraImport: data.isExtraImport,
        })
      })
    }

    if (typeExports) {
      typeExports.forEach(exportName => {
        items.push({
          label: exportName,
          description: importPath,
          exportType: ExportType.type,
          isExtraImport: data.isExtraImport,
        })
      })
    }
  }

  return items
}

async function insertImportJs({label: exportName, description: importPath, exportType, isExtraImport}) {
  const S = SETTINGS.js
  const editor = window.activeTextEditor

  let absImportPath

  if (!isExtraImport) {
    const activeFilepath = editor.document.fileName
    absImportPath = path.join(S.projectRoot, importPath)
    importPath = getRelativeImportPath(activeFilepath, absImportPath)

    if (S.processImportPath) importPath = S.processImportPath(importPath, absImportPath, activeFilepath, S.projectRoot)

    if (path.basename(importPath).startsWith('index.js')) {
      importPath = path.dirname(importPath)
    } else {
      importPath = trimPath(importPath)
    }
  }

  // Determine which line number should get the import. This could be merged into that line if they have the same path
  // (resulting in lineIndexModifier = 0), or inserted as an entirely new import line before or after
  // (lineIndexModifier = -1 or 1)

  let lineIndex
  let lineIndexModifier = 1
  const importLines = []
  const lines = editor.document.getText().split('\n')

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

    if (linePath > importPath) {
      lineIndex = i
      lineIndexModifier = -1
      break
    }

    lineIndex = i
  }

  // Determine all imports for new line and build new line text

  let defaultImport = exportType === ExportType.default ? exportName : null
  const namedImports = exportType === ExportType.named ? [exportName] : []
  const typeImports = exportType === ExportType.type ? ['type ' + exportName] : []

  if (!lineIndexModifier) {
    const line = multiLineStart
      ? lines.slice(multiLineStart, lineIndex + 1).join(' ')
      : lines[lineIndex]
    
    const hasDefault = line[7] !== '{'
    if (exportType === ExportType.default) {
      if (hasDefault) return // default export already exists
    } else if (hasDefault) {
      defaultImport = strBetween(line, ' ').replace(',', '')
    }
    
    strBetween(line, '{', '}').split(',').forEach(item => {
      const trimmedItem = item.trim()
      if (trimmedItem.startsWith('type ')) {
        typeImports.push(trimmedItem)
      } else {
        namedImports.push(trimmedItem)
      }
    })
  }

  namedImports.sort()
  typeImports.sort()

  let newLine = 'import'
  if (defaultImport) newLine += ' ' + defaultImport
  
  if (namedImports.length || typeImports.length) {
    if (defaultImport) newLine += ','
    newLine += ' {'
    if (S.padCurlyBraces) newLine += ' '
    newLine += namedImports.join(', ') + typeImports.join(', ')
    if (S.padCurlyBraces) newLine += ' '
    newLine += '}'
  }

  const quoteChar = S.quoteType === 'single' ? '\'' : '"'
  newLine += ' from ' + quoteChar + importPath + quoteChar
  if (S.useSemicolons) newLine += ';'

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

function getRelativeImportPath(file, absImportPath) {
  const relativePath = path.relative(path.dirname(file), absImportPath)
  return relativePath[0] === '.' ? relativePath : '.' + path.sep + relativePath
}

module.exports = {
  ExportType,
  readCacheFileJs,
  insertImportJs,
}
