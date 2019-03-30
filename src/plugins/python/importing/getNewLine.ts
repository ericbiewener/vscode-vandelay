import { PluginPy } from '../types'
import { getTabChar } from '../../../utils'

export function getNewLine(
  plugin: PluginPy,
  importPath: string,
  lineImports: string[]
) {
  const { maxImportLineLength } = plugin

  lineImports.sort()

  const newLineStart = 'from ' + importPath + ' import '
  const newLineEnd = lineImports.join(', ')

  const tabChar = getTabChar()
  const newLineLength = newLineStart.length + newLineEnd.length

  if (newLineLength <= maxImportLineLength) {
    return newLineStart + newLineEnd
  }

  let line = newLineStart + '('
  let fullText = ''

  lineImports.forEach((name, i) => {
    const isLast = i === lineImports.length - 1

    let newText = (i > 0 ? ' ' : '') + name
    if (!isLast) newText += ','

    let newLength = line.length + newText.length
    if (isLast) newLength++ // for closing parenthesis

    if (newLength < maxImportLineLength) {
      line += newText
    } else {
      fullText += line + '\n'
      line = tabChar + newText.trim()
    }

    if (isLast) fullText += line
  })

  return fullText + ')'
}
