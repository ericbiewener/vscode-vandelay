// TODO: use lodash-es fix in webpack
import _ from 'lodash'

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
  imports?: string[]
  renamed?: { [originalName: string]: string }
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
    }
    // if match[2] does not exist, it's a full package import (`import json`)
    if (match[2]) {
      const matchText = replacer ? match[2].replace(replacer, '') : match[2]
      importData.imports = []
      for (const imp of matchText.split(',')) {
        const parts = imp.split(' as ')
        const name = parts[0].trim()
        if (!name) continue
        importData.imports.push(name)
        if (parts[1]) {
          // TODO: use defaultdict equivalent with Proxy https://stackoverflow.com/questions/19127650/defaultdict-equivalent-in-javascript
          // many other places for defaultdict functionality as well
          const renamed = importData.renamed || {}
          importData.renamed = renamed || {}
          renamed[name] = parts[1].trim()
        }
      }
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
