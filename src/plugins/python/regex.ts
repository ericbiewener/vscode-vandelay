// TODO: use lodash-es fix in webpack
import _ from 'lodash'
import { addNamesAndRenames, Renamed } from '../../utils'

export const commentRegex = /^(?:[ \t]*#|[ \t]*"""[^]*?""").*/gm

/**
 * Regexes must end with `.*` after last capturing group to ensure that we capture the full line.
 * This is necessary so that the `end` property in the results is the correct character.
 *
 * Matching groups:
 *    1. path
 *    2. imports
 */
export const importRegex = {
  entirePackage: /^import ([^\s]+)/gm,
  singleLine: /^from +(.+) +import +([^(#"\n\r]+).*/gm,
  multiline: /^from +?(.+) +?import +\(([\S\s]*?)\).*/gm,
}

export type ParsedImportPy = {
  path: string
  start: number
  end: number
  imports: string[]
  renamed: { [originalName: string]: string }
}

function parseImportsWithRegex(
  imports: ParsedImportPy[],
  text: string,
  regex: RegExp,
  replacer?: RegExp
) {
  let match
  while ((match = regex.exec(text))) {
    const importData: ParsedImportPy = {
      path: match[1],
      start: match.index,
      end: match.index + match[0].length,
      imports: [],
      renamed: {},
    }
    // if match[2] does not exist, it's a full package import (`import json`)
    if (match[2]) {
      const matchText = replacer ? match[2].replace(replacer, '') : match[2]
      addNamesAndRenames(
        matchText.split(','),
        importData.imports,
        importData.renamed
      )
    }
    imports.push(importData)
  }

  regex.lastIndex = 0
  return imports
}

export function parseImports(text: string) {
  // Mutate imports
  const imports: ParsedImportPy[] = []
  parseImportsWithRegex(imports, text, importRegex.entirePackage)
  parseImportsWithRegex(imports, text, importRegex.singleLine)
  parseImportsWithRegex(imports, text, importRegex.multiline, /[()]/g)
  return imports.sort((a, b) => a.start - b.start)
}
