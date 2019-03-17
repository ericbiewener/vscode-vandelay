import {
  FileExportsJs,
  PluginJs,
  MergedExportDataJs,
  CachingDataJs,
  ExportDataJs
} from "./plugins/javascript/types";
import { ExportType } from "./plugins/javascript/importing/buildImportItems";
import { DiagnosticFilter } from "./utils";
import {
  PluginPy,
  CachingDataPy,
  FileExportsPy,
  MergedExportDataPy,
  ExportDataPy
} from "./plugins/python/types";
// import { PluginPy } from "./plugins/python/types";

export type Obj = { [k: string]: any };

export type RichQuickPickItem = {
  label: string;
  description: string;
  isExtraImport: boolean | undefined;
  absImportPath: string;
  [key: string]: any;
};

/**
 * Data Structurs
 */

export type FileExports = FileExportsJs | FileExportsPy;
export type CachingData = CachingDataJs | CachingDataPy;
export type MergedExportData = MergedExportDataJs | MergedExportDataPy;
export type ExportData = ExportDataJs | ExportDataPy;

/**
 * Plugin Config
 */

export type Plugin = PluginJs | PluginPy;

type ExcludePatterns = (string | RegExp)[];

// FIXME: not sure that this is right. Not sure that the division of all these configs is right.
export type UserConfig = {
  includePaths: string[];
  maxImportLineLength?: number;
  nonModulePaths?: string[];
  projectRoot?: string;
  processImportPath?(
    importPath: string,
    absImportPath: string,
    activeFilepath: string,
    projectRoot: string
  ): string | undefined;
  processDefaultName?(path: string): string | undefined;
  excludePatterns?: ExcludePatterns;
  shouldIncludeImport?(absImportPath: string, activeFilepath: string): boolean;
};

export type PluginConfig = {
  language: string;
  cacheFile(plugin: Plugin, path: string, data: CachingData): CachingData;
  processCachedData?(data: any): any;
  buildImportItems(
    plugin: Plugin,
    data: MergedExportData,
    sortedKeys: string[]
  ): RichQuickPickItem[];
  insertImport(plugin: Plugin, selection: RichQuickPickItem): Promise<any>;
  removeUnusedImports(plugin: Plugin): Promise<any>;
  shouldIncludeDisgnostic: DiagnosticFilter;
  excludePatterns?: ExcludePatterns;
};

export type DefaultPluginConfig = {
  maxImportLineLength: number;
  excludePatterns: ExcludePatterns[];
};

export type RuntimePluginConfig = {
  configFile: string;
  cacheFilePath: string;
  projectRoot: string;
  cacheDirPath: string;
};

// export type Plugin = PluginJs | PluginPy
