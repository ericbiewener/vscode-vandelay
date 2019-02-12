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
  trailingComma?: boolean,
  processImportPath?(importPath: string, absImportPath: string, activeFilepath: string, projectRoot: string): string | undefined,
  processDefaultName?(path: string): string | undefined
}

export type FileExports = {
  default?: string,
  named: string[],
  types: string[],
}

export type ExportDatumJs = ExportDatum & FileExports & {
  // TODO: are the below definitions correct? rename to make clearer
  // Exports in current file that are reexported elsewhere
  reexports?: string[],
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
  reexportsToProcess: {
    fullModules: string[],
    selective: { [path: string]: string[] }
  }
}

export type NonFinalExportDataJs = { [path: string]: NonFinalExportDatumJs }

export type CachingData = {
  exp: NonFinalExportDataJs,
  imp: { [path: string]: FileExports },
}
