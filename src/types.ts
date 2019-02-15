import { QuickPickItem } from 'vscode'
import { FileExports } from './plugins/javascript/types'

export type Obj = { [k: string]: any }

export type ExportDatum = {
}

export type ExportDatumJs = FileExports & {
  isExtraImport?: boolean,
  // JS
  // TODO: are the below definitions correct? rename to make clearer
  // Exports in current file that are reexported elsewhere
  reexports?: string[],
  // Exports in other files that are reexported in current file
  reexported?: {
    reexportPath: string,
    reexports: string[],
  }
}

export type NonFinalExportDatum = ExportDatum & {
  reexportsToProcess: {
    fullModules: string[],
    selective: { [path: string]: string[] }
  }
}

export type NonFinalExportData = { [path: string]: NonFinalExportDatum }

export type ExportData = { [path: string]: ExportDatum }

export type CachingData = {
  exp: NonFinalExportData,
  imp: {
    [path: string]: FileExports & { isExtraImport?: boolean }
  },
}

// Divide type into stuff that came from plugin config vs other? And then do PluginConfig & ...?
export type Plugin = {
  language: string,
  configFile: string,
  cacheFilePath: string,
  projectRoot: string,
  includePaths: string[],
  excludePatterns: (string | RegExp)[],
  cacheDirPath: string,
  processCachedData?(data: any): any,
  shouldIncludeImport(absImportPath: string, activeFilepath: string): boolean,
  cacheFile(plugin: Plugin, path: string, data: CachingData): Promise<CachingData>,
  buildImportItems(plugin: Plugin, data: ExportData): QuickPickItem[],
  insertImport(plugin: Plugin, selection: QuickPickItem): Promise<void>,

  // JS
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
