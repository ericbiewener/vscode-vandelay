import { TextEdit } from 'vscode'
import {
  FileExportsJs,
  PluginJs,
  MergedExportDataJs,
  CachingDataJs,
  ExportDataJs,
  RichQuickPickItemJs,
} from './plugins/javascript/types'
import { DiagnosticFilter } from './utils'
import {
  PluginPy,
  CachingDataPy,
  FileExportsPy,
  MergedExportDataPy,
  ExportDataPy,
} from './plugins/python/types'
import { ImportPositionPy } from './plugins/python/importing/getImportPosition'
import { ImportPositionJs } from './plugins/javascript/importing/getImportPosition'

export type Language = 'js' | 'py'

export interface RichQuickPickItem {
  label: string
  description?: string | undefined
  isExtraImport: boolean | undefined
}
type AllRichQuickPickItem = RichQuickPickItem | RichQuickPickItemJs

export type ImportPosition = ImportPositionJs | ImportPositionPy

/**
 * Cached Data Structurs
 */

export type FileExports = FileExportsJs | FileExportsPy
export type CachingData = CachingDataJs | CachingDataPy
export type MergedExportData = MergedExportDataJs | MergedExportDataPy
export type ExportData = ExportDataJs | ExportDataPy

/**
 * Plugin Config
 */

export type Plugin = PluginJs | PluginPy

type ExcludePatterns = (string | RegExp)[]

export interface UserConfig {
  includePaths: string[]
  maxImportLineLength?: number
  nonModulePaths?: string[]
  projectRoot?: string
  processImportPath?(
    importPath: string,
    absImportPath: string,
    activeFilepath: string,
    projectRoot: string
  ): string | undefined
  excludePatterns?: ExcludePatterns
  shouldIncludeImport?(absImportPath: string, activeFilepath: string): boolean
}

export type InsertImport = (
  plugin: Plugin,
  selection: AllRichQuickPickItem,
  shouldApplyEdit?: boolean
) => Thenable<boolean> | TextEdit | void

export interface PluginConfig {
  language: Language
  shouldIncludeDisgnostic: DiagnosticFilter
  excludePatterns?: ExcludePatterns
  cacheFile(plugin: Plugin, path: string, data: CachingData): CachingData
  processCachedData?(data: any): any
  removeUnusedImports(plugin: Plugin): Promise<any>
  insertImport: InsertImport
}

export interface DefaultPluginConfig {
  maxImportLineLength: number
  excludePatterns: ExcludePatterns[]
}

export interface RuntimePluginConfig {
  configFile: string
  configFilepath: string
  cacheFilepath: string
  projectRoot: string
  cacheDirPath: string
}
