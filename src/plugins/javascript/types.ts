import { Plugin, ExportDatum } from '../../types'

export type PluginJs = Plugin & {
  maxImportLineLength: number,
  nonModulePaths?: string[],
  useES5?: boolean,
  preferTypeOutside?: boolean,
  padCurlyBraces?: boolean,
  useSingleQuotes?: boolean,
  useSemicolons?: boolean,
  multilineImportStyle?: 'single' | 'multiple',
  processImportPath?(importPath: string, absImportPath: string, activeFilepath: string, projectRoot: string): string | undefined,
  trailingComma?: boolean,
}

export type FileExports = {
  default?: string,
  named: string[],
  types: string[],
}

export type ExportDatumJs = ExportDatum & FileExports & {
  // Exports in current file that are reexported elsewhere
  reexports: string[],
  // Exports in other files that are reexported in current file
  reexported?: {
    reexportPath: string,
    reexports: string[],
  }
}

export type ExportDataJs = {
  [path: string]: ExportDatumJs,
}

// TODO: can remove Js suffix?
export type NonFinalExportDatumJs = ExportDatumJs & {
  all: string[],
  // TODO: rename to `reexported` to match ExportDatumJs ? Not sure exactly how this property compares
  reexports: { [path: string]: string[] }
}

export type NonFinalExportDataJs = {
  [path: string]: NonFinalExportDatumJs,
} & {
  _extraImports: ExportDataJs
}
