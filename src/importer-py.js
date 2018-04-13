const path = require('path')
const {parseCacheFile} = require('./utils')
const {PLUGINS} = require('./plugins')
const {LineModifier} = require('./constants')

function readCacheFilePy() {
  const S = PLUGINplugin.py
  const exportData = parseCacheFile('py', true)
  if (!exportData) return

  const activeFilepath = atom.workspace.getActiveTextEditor().getPath()

  const items = []

  for (const importPath of Object.keys(exportData).sort()) {
    if (plugin.shouldIncludeImport && !plugin.shouldIncludeImport(path.join(plugin.projectRoot, importPath), activeFilepath)) {
      continue
    }

    const data = exportData[importPath]
    if (plugin.processImportPath) importPath = plugin.processImportPath(importPath)

    for (const exportName of data) {
      const fullText = importPath !== '_' ? exportName + ' ' + importPath : exportName
      items.push({
        importPath,
        exportName,
        fullText,
      })
    }
  }

  return items
}

// TODO rename either exportName to importName or importPath to exportPath. probably the former
function insertImportPy({label: exportName, detail: importPath}) {
  const editor = atom.workspace.getActiveTextEditor()
  const activeFilepath = editor.getPath()
  const hasFrom = importPath !== '_'

  if (hasFrom && plugin.processImportPath) {
    const absImportPath = path.join(plugin.projectRoot, importPath)
    importPath = plugin.processImportPath(importPath, absImportPath, activeFilepath, plugin.projectRoot)
  }

  const lines = editor.getText().split('\n')

  let importPos // line to use as reference
  let importPosModifier
  let lastImportLineNum

  // TODO custom sorting
  // if (plugin.getImportLineNumber) importPos = plugin.getImportLineNumber(lines, importPath)
  // if (importPos != null) {
  //   const linePath = lines[0].split(' ')[1]
  // }

  if (hasFrom) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.startsWith('from ')) continue
      const lineImportPath = line.split(' ')[1]
      if (importPath === lineImportPath) {
        importPos = i
        importPosModifier = LineModifier.same
        break
      }

      if (importPath < lineImportPath || lineImportPath.startsWith('.')) {
        importPos = i
        importPosModifier = LineModifier.before
        break
      }

      lastImportLineNum = i
    }
  }
  else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.startsWith('import ')) continue
      lastImportLineNum = i

      const packageName = line.slice(7)
      if (exportName === packageName) return // import already exists
      if (exportName < packageName) {
        importPos = i
        importPosModifier = LineModifier.before
        break
      }
    }
  }

  // Insert line after all other imports
  if (importPos == null) {
    if (lastImportLineNum) {
      importPos = lastImportLineNum
      importPosModifier = LineModifier.after
    }
    else { // no non-from imports exist. insert before first "from" line
      importPos = lines.findIndex(l => l.startsWith('from '))
      if (importPos === -1) importPos = 0
      importPosModifier = LineModifier.before
    }
  }

  let newLine = hasFrom ? 'from ' + importPath + ' ' : ''

  if (importPosModifier === LineModifier.before) {
    newLine += 'import ' + exportName + '\n'
    const range = [importPos, 0]
    editor.setTextInBufferRange([range, range], newLine)
    return
  }

  if (importPosModifier === LineModifier.after) {
    newLine = '\n' + newLine + 'import ' + exportName
    const range = [importPos, lines[importPos].length]
    editor.setTextInBufferRange([range, range], newLine)
    return
  }

  // If we're here, imports already exist for the selected importPath

  let imports
  const line = lines[importPos]
  let endLine = importPos
  // Current text is multiline
  if (line.includes('(')) {
    imports = line.slice(line.indexOf('(') + 1, -1).split(',') // -1 applies to the trailing comma

    for (let i = importPos + 1; i < lines.length; i++) {
      const ln = lines[i].trim()
      imports = [...imports, ...ln.slice(0, -1).split(',')] // -1 applies either to the closing parenthesis or trailing comma
      if (ln.includes(')')) {
        endLine = i
        break
      }
    }

  }
  // Current text is single line
  else {
    imports = line.slice(line.indexOf('import ') + 7).split(',')
  }

  imports.push(exportName)
  imports = imports.map(i => i.trim())

  const newLineStart = 'from ' + importPath + ' import '
  const importText = imports.join(', ')
  newLine = newLineStart + importText

  // Single line
  if (newLine.length <= plugin.maxImportLineLength) {
    editor.setTextInBufferRange([[importPos, 0], [importPos, lines[importPos].length]], newLine)
  }

  // Multi Line
  const tabChar = editor.getTabText()
  newLine = newLineStart + '('
  let currLine = newLine
  const items = importText.split(' ')
  items.forEach((item, i) => {
    const closingParenModifier = i === items.length ? 1 : 0 // last item will have a parentheses, thus increasing the length by one
    if (currLine.length + item.length + 1 + closingParenModifier > plugin.maxImportLineLength) { // 1 = space
      currLine = tabChar + item
      newLine += '\n' + currLine
    } else {
      const newText = (i ? ' ' : '') + item
      newLine += newText
      currLine += newText
    }
  })
  newLine += ')'
  editor.setTextInBufferRange([[importPos, 0], [endLine, lines[endLine].length]], newLine)
}

module.exports = {
  readCacheFilePy,
  insertImportPy,
}
