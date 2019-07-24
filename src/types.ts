import { Disposable, TextEdit, CompletionItemProvider } from 'vscode'
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

export type RichQuickPickItem = {
  label: string
  description?: string | undefined
  isExtraImport: boolean | undefined
}

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

type ExcludePattern = string | RegExp

export type DefaultPluginConfig = {
  maxImportLineLength: number
  excludePatterns: ExcludePattern[]
}

export type RuntimePluginConfig = {
  configFile: string
  configFilepath: string
  cacheFilepath: string
  projectRoot: string
  cacheDirPath: string
}

export interface PluginConfig<Q extends RichQuickPickItem = RichQuickPickItem> {
  language: Language
  shouldIncludeDisgnostic: DiagnosticFilter
  cacheFile(plugin: this, path: string, data: CachingData): CachingData
  processCachedData?(data: any): any
  removeUnusedImports(plugin: this): Promise<any>
  insertImport(
    plugin: this,
    selection: Q,
    shouldApplyEdit?: boolean
  ): Thenable<boolean> | TextEdit | void
  buildImportItems(plugin: this, data: MergedExportData, sortedKeys: string[]): Q[]
  extensions: string[]
  importGroups?: string[] | string[][]
  excludePatterns?: ExcludePattern[]
}

export type UserConfig = {
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
  excludePatterns?: ExcludePattern[]
  shouldIncludeImport?(absImportPath: string, activeFilepath: string): boolean
}

type MergedConfigs = Omit<UserConfig, 'excludePatterns'> & DefaultPluginConfig & RuntimePluginConfig
type PluginConfigToExtend<Q extends RichQuickPickItem = RichQuickPickItem> = Omit<
  PluginConfig<Q>,
  'excludePatterns'
>

export interface Plugin<Q extends RichQuickPickItem = RichQuickPickItem>
  extends PluginConfigToExtend<Q>,
    MergedConfigs {}
