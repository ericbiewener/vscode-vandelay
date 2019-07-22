import { Diagnostic } from 'vscode'
import { removeUnusedImports } from './removeUnusedImports'
import { cacheFile, processCachedData } from './cacher'
import { buildImportItems } from './importing/buildImportItems'
import { insertImport } from './importing/importer'
import { PluginConfigJs } from './types'

export const JS_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'mdx']

type DiagnosticCode = string | number | undefined

const ESLINT_CODES: DiagnosticCode[] = ['no-undef', 'react/jsx-no-undef']
const TYPESCRIPT_CODES: DiagnosticCode[] = [2304, 2552]

function shouldIncludeDisgnostic({ code, source, message }: Diagnostic) {
  return (
    ESLINT_CODES.includes(code) ||
    (source === 'flow' && message.startsWith('Cannot resolve name')) ||
    (source === 'ts' && TYPESCRIPT_CODES.includes(code))
  )
}

export const jsConfig: PluginConfigJs = {
  language: 'js',
  cacheFile,
  processCachedData,
  buildImportItems,
  insertImport,
  removeUnusedImports,
  shouldIncludeDisgnostic,
  useSingleQuotes: true,
  padCurlyBraces: true,
  useSemicolons: true,
  trailingComma: true,
  multilineImportStyle: 'multiple',
  excludePatterns: [/.*\/node_modules(\/.*)?/],
  extensions: JS_EXTENSIONS,
}
