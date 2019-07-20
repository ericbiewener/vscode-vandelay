import { Disposable } from 'vscode'
import {
  DefaultPluginConfig,
  MergedExportData,
  PluginConfig,
  RichQuickPickItem,
  RuntimePluginConfig,
  UserConfig,
} from '../../types'

/**
 * Cached Data Structures
 */

export interface FileExportsPy {
  importEntirePackage?: boolean
  exports?: string[]
}

export type ExportDatumPy = FileExportsPy & {
  cached?: number
}

export interface ReexportsToProcess {
  fullModules: string[]
  selective: { [path: string]: string[] }
}

export interface ExportDataImportsPy {
  [path: string]: FileExportsPy
}
export interface ExportDataExportsPy {
  [path: string]: ExportDatumPy
}
export interface MergedExportDataPy {
  [path: string]: ExportDatumPy & { isExtraImport?: true }
}

export interface ExportDataPy {
  imp: ExportDataImportsPy
  exp: ExportDataExportsPy
}

export interface CachingDataPy {
  exp: ExportDataExportsPy
  imp: {
    [path: string]: FileExportsPy & { isExtraImport?: true }
  }
}

/**
 * Plugin Config
 */

export type PluginConfigPy = PluginConfig & {
  language: 'py'
  buildImportItems(
    plugin: PluginPy,
    data: MergedExportData,
    sortedKeys: string[]
  ): RichQuickPickItem[]
  registerCompletionItemProvider(): Disposable[]
}

export type UserConfigPy = UserConfig & {
  importGroups?: string[][]
  processImportName?(
    importName: string,
    importPath: string,
    absImportPath: string,
    activeFilepath: string,
    projectRoot: string
  ): string | undefined
}

export type PluginPy = DefaultPluginConfig & PluginConfigPy & UserConfigPy & RuntimePluginConfig
