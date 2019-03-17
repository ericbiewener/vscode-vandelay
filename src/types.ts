import {
  FileExportsJs,
  PluginJs,
  MergedExportDataJs,
  CachingDataJs,
  ExportDataJs
} from "./plugins/javascript/types";
import { ExportType } from "./plugins/javascript/importing/buildImportItems";
import { DiagnosticFilter } from "./utils";
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

export type FileExports = FileExportsJs;
export type CachingData = CachingDataJs;
export type MergedExportData = MergedExportDataJs;
export type ExportData = ExportDataJs;

/**
 * Plugin Config
 */

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

export type Plugin = PluginJs;
// export type Plugin = PluginJs | PluginPy
