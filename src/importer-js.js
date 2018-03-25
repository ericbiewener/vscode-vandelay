/** @babel */
import path from 'path'
import _ from 'lodash'
import babylonParse, {babylonParseImports} from './babylonParse'
import {parseCacheFile, trimPath} from './utils'
import {getSettings} from './settings'
import {MULTILINE_IMPORT_STYLE, LINE_MODIFIER} from './constants'

const S = getSettings('js')

export const EXPORT_TYPE = {
  default: 'D',
  named: 'N',
  type: 'T',
}

/**
 * Rather than just returning the bare minimum data, this function should actually do as much work as possible
 * because it is only called once per Vandelay activation, whereas `SelectListView.elementForItem()` is called
 * with every key press when filtering the items. This is why the returned object contains all the formats that
 * might be needed.
 */
export function readCacheFileJs() {
  const exportData = parseCacheFile(true)
  if (!exportData) return

  const activeFilepath = atom.workspace.getActiveTextEditor().getPath()
  const items = []

  for (const importPath of Object.keys(exportData).sort()) {
    if (S.shouldIncludeImport && !S.shouldIncludeImport(path.join(S.projectRoot, importPath), activeFilepath)) {
      continue
    }
    const data = exportData[importPath]
    let defaultExport
    let namedExports
    let typeExports

    if (S.preferReexported && data.reexported) {
      if (data.default && !data.reexported.includes('default')) defaultExport = data.default
      if (data.named) namedExports = data.named.filter(e => !data.reexported.includes(e))
      if (data.types) typeExports = data.types.filter(e => !data.reexported.includes(e))
    } else {
      defaultExport = data.default
      namedExports = data.named
      typeExports = data.types
    }

    // `fullText` prop used for fuzzy matching

    if (defaultExport) {
      const exportName = defaultExport

      items.push({
        importPath,
        exportName,
        exportType: EXPORT_TYPE.default,
        fullText: exportName + ' ' + importPath,
        isExtraImport: data.isExtraImport,
      })
    }

    if (namedExports) {
      namedExports.forEach(exportName => {
        items.push({
          importPath,
          exportName,
          exportType: EXPORT_TYPE.named,
          fullText: exportName + ' ' + importPath,
          isExtraImport: data.isExtraImport,
        })
      })
    }

    if (typeExports) {
      typeExports.forEach(exportName => {
        items.push({
          importPath,
          exportName,
          exportType: EXPORT_TYPE.type,
          fullText: exportName + ' ' + importPath,
          isExtraImport: data.isExtraImport,
        })
      })
    }
  }

  return items
}

export function insertImportJs({exportName, exportType, importPath, isExtraImport}) {
  const editor = atom.workspace.getActiveTextEditor()

  let absImportPath

  if (!isExtraImport) {
    const activeFilepath = editor.getPath()
    absImportPath = path.join(S.projectRoot, importPath)
    importPath = getRelativeImportPath(activeFilepath, absImportPath)

    if (S.processImportPath) importPath = S.processImportPath(importPath, absImportPath, activeFilepath, S.projectRoot)

    if (path.basename(importPath).startsWith('index.js')) {
      importPath = path.dirname(importPath)
    } else {
      importPath = trimPath(importPath)
    }
  }

  /**
   * Determine if an equivalent path exists, and whether it is of the same type (value or flow type)
   */

  const ats = babylonParseImports(editor.getText(), 'Could not add import.')
  if (!ats) return

  const isType = exportType === EXPORT_TYPE.type
  let existingNode
  let existingNodeIndexModifier
  const importNodes = []

  for (const node of ats.program.body) {
    if (node.type !== 'ImportDeclaration') continue

    if (node.source.value !== importPath) {
      importNodes.push(node)
      continue
    }

    existingNode = node

    // If we move to only support sameLineType imports, all the existingNodeIndexModifier logic can be removed
    if ((!isType && node.importKind === 'value') || (isType && S.sameLineType)) {
      existingNodeIndexModifier = LINE_MODIFIER.same
      break
    } else if (isType) {
      existingNodeIndexModifier = LINE_MODIFIER.after
    } else {
      existingNodeIndexModifier = LINE_MODIFIER.before
    }
  }

  const imports = {named: [], types:[]}

  /**
   * Determine all imports for new line and build new line text
   */

  if (existingNode && !existingNodeIndexModifier) {
    for (const spec of existingNode.specifiers) {
      const {name} = spec.local
      if (name === exportName) return // Already imported
      if (spec.type === 'ImportDefaultSpecifier') {
        imports.default = name
      } else {
        const importArray = spec.importKind === 'type' ? imports.types : imports.named
        importArray.push(name)
      }
    }
  }

  if (exportType === EXPORT_TYPE.default) {
    imports.default = exportName
  } else if (!isType) {
    imports.named.push(exportName)
  } else {
    imports.types.push(exportName)
  }

  imports.types.sort()
  imports.named = [...imports.named, ...imports.types.map(i => 'type ' + i)]

  let newLine = getNewLine(imports, importPath, isType)

  /**
   * Insert new line
   */

  let bufferRange
  let needsAdditionalLineBreak

  if (!existingNode || (existingNode && existingNodeIndexModifier)) newLine = newLine + '\n'

  if (existingNode) {
    if (!existingNodeIndexModifier) {
      bufferRange = existingNode.loc
    } else if (existingNodeIndexModifier === LINE_MODIFIER.before) {
      bufferRange = rangeBeforeNode(existingNode)
    } else {
      bufferRange = rangeAfterNode(existingNode)
    }
  }
  else if (importNodes.length) {
    // If `S.importOrderMap` == null, then S.importOrder is a function
    const node = S.importOrderMap
      ? getImportPos(importPath, isExtraImport, importNodes)
      : S.importOrder(importPath, absImportPath, isType, isExtraImport, importNodes)

    bufferRange = node ? rangeBeforeNode(node) : rangeAfterNode(_.last(importNodes))
    needsAdditionalLineBreak = !node
  }
  else {
    const fullAts = babylonParse(editor.getText(), absImportPath)
    let end = 0
    let node
    needsAdditionalLineBreak = true
    for (const n of fullAts.comments) {
      if (n.loc.start.line > end + 1) {
        // There is a line gap between the comments, so we insert there.
        needsAdditionalLineBreak = false
        break
      }
      end = n.loc.end.line
      node = n
    }
    bufferRange = node ? rangeAfterNode(node) : getCollapsedRange({line: 0, column: 0})
  }

  if (needsAdditionalLineBreak) {
    const nextLineText = editor.getTextInBufferRange([ [bufferRange.start.line, 0], [bufferRange.start.line, 6] ])
    console.log({nextLineText})
  }

  // Subtract 1 from the line numbers since the text buffer is 0-indexed
  editor.setTextInBufferRange([
    [bufferRange.start.line - 1, bufferRange.start.column],
    [bufferRange.end.line - 1, bufferRange.end.column],
  ], newLine)
}

function getImportPos(importPath, isExtraImport, nodes) {
  const pos = S.importOrderMap[importPath]
  const pathStarts = [...(S.absolutePaths || []), '.', '/']

  // node.source.value is the node's import path string

  if (pos != null) {
    return _.find(nodes, ({source: {value}}) => {
      const nodePos = S.importOrderMap[value]
      return nodePos == null || nodePos > pos
    })
  }

  if (isExtraImport) {
    return _.find(nodes, ({source: {value}}) => (
      S.importOrderMap[value] == null &&
      (_.some(pathStarts, p => value.startsWith(p))
      || importPath < value)
    ))
  }

  const absPos = _.findIndex(S.absolutePaths, p => importPath.startsWith(p))
  return _.find(nodes, ({source: {value}}) => {
    // By using `pathStarts` here, we will get either the absolute path index, or the index of '.' or '/'.
    // A -1 indicates that it is a node module.
    const sourceIndex = _.findIndex(pathStarts, p => value.startsWith(p))
    if (sourceIndex < 0) return // source is a node module
    if (sourceIndex < pathStarts.length - 2 && absPos < 0) return // source is an absolute path
    if (absPos > -1 && absPos < sourceIndex) return true // both are absolute paths
    return importPath < value // both are relative paths
  })
}

function getCollapsedRange(pos) {
  return {start: pos, end: pos}
}

function rangeBeforeNode(node) {
  return getCollapsedRange(node.loc.start)
}

function rangeAfterNode(node) {
  return getCollapsedRange({line: node.loc.end.line + 1, column: 0})
}

function getRelativeImportPath(file, absImportPath) {
  const relativePath = path.relative(path.dirname(file), absImportPath)
  return relativePath[0] === '.' ? relativePath : '.' + path.sep + relativePath
}

function getNewLine(imports, importPath, isType) {
  let namedText = ''

  const semicolonChar = S.useSemicolons ? ';' : ''
  const quoteChar = S.quoteType === 'single' ? '\'' : '"'

  let start = 'import ' + (isType && !S.sameLineType ? 'type ' : '') + (imports.default || '')
  let end = ' from ' + quoteChar + importPath + quoteChar + semicolonChar

  if (imports.named.length) {
    if (imports.default) start += ', '
    const curlyBracePaddingChar = S.padCurlyBraces ? ' ' : ''
    start += '{' + curlyBracePaddingChar
    end = curlyBracePaddingChar + '}' + end

    imports.named.sort()
    namedText += imports.named.join(', ')
  }

  const editor = atom.workspace.getActiveTextEditor()
  const tabChar = editor.getTabText()

  let fullText = start + namedText + end
  // Even if the line is too long, return the single line if there are no named imports.
  if (fullText.length <= S.maxImportLineLength || (!imports.named.length)) return fullText
  if (S.multilineImportStyle === MULTILINE_IMPORT_STYLE.single) {
    const commaDangleChar = S.commaDangle ? ',' : ''
    // trim start & end to remove padding before curly brace
    return start.trim() + '\n' + tabChar + imports.named.join(',\n' + tabChar) + commaDangleChar + '\n' + end.trim()
  }

  let line = start
  fullText = ''
  imports.named.push(end)

  imports.named.forEach((name, i) => {
    const isLast = i === imports.named.length - 1
    let newText = (i > 0 ? ' ' : '') + name
    if (!isLast) newText += ','

    if (line.length + newText.length <= S.maxImportLineLength) {
      line += newText
    } else {
      if (!isLast) {
        newText += tabChar
      } else {
        // newText is the value of `end`. It may have padding before the curly brace, which is no longer
        // desireable since it is on its own line. So trim it off.
        newText = newText.trim()
      }
      fullText += line + '\n' + newText
      line = ''
    }
  })

  return (fullText + line).trim()
}

export function jsElementForItem(li, {exportType}) {
  const typeEl = document.createElement('span')
  if (exportType !== EXPORT_TYPE.named) typeEl.textContent = exportType
  const firstNode = li.childNodes[0]
  firstNode.insertAdjacentElement('afterend', typeEl)
}
