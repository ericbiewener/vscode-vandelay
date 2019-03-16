import { FileExports } from "./plugins/javascript/types";
import { ExportType } from "./plugins/javascript/importing/buildImportItems";
import { DiagnosticFilter } from "./utils";

export type Obj = { [k: string]: any };

export type RichQuickPickItem = {
  label: string;
  description: string;
  isExtraImport: boolean | undefined;
  absImportPath: string;
  [key: string]: any;
};

export type ExportDatum = FileExports & {
  cached?: number;
  // JS
  // TODO: are the below definitions correct? rename to make clearer
  // Exports in current file that are reexported elsewhere
  reexports?: string[];
  // Exports in other files that are reexported in current file
  reexported?: {
    reexportPath: string;
    reexports: string[];
  };
};

export type NonFinalExportDatum = ExportDatum & {
  reexportsToProcess: {
    fullModules: string[];
    selective: { [path: string]: string[] };
  };
};

export type NonFinalExportData = { [path: string]: NonFinalExportDatum };

export type ExportDataImports = { [path: string]: FileExports };
export type ExportDataExports = { [path: string]: ExportDatum };
export type MergedExportData = {
  [path: string]: ExportDatum & { isExtraImport?: boolean };
};

export type ExportData = {
  imp: ExportDataImports;
  exp: ExportDataExports;
};

export type CachingData = {
  exp: NonFinalExportData;
  imp: {
    [path: string]: FileExports & { isExtraImport?: boolean };
  };
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

  // JS
  maxImportLineLength: number;
  nonModulePaths?: string[];
  useES5?: boolean;
  preferTypeOutside?: boolean;
  padCurlyBraces?: boolean;
  useSingleQuotes?: boolean;
  useSemicolons?: boolean;
  multilineImportStyle?: "single" | "multiple";
  trailingComma?: boolean;
  importGroups?: string[][];
  processImportPath?(
    importPath: string,
    absImportPath: string,
    activeFilepath: string,
    projectRoot: string
  ): string | undefined;
  processDefaultName?(path: string): string | undefined;
};

// FIXME: Divide type into stuff that came from plugin config vs other? And then do PluginConfig & ...?
export type Plugin = PluginConfig & {
  configFile: string;
  cacheFilePath: string;
  projectRoot: string;
  includePaths: string[];
  excludePatterns: (string | RegExp)[];
  cacheDirPath: string;
  shouldIncludeImport(absImportPath: string, activeFilepath: string): boolean;

  shouldIncludeDisgnostic?: DiagnosticFilter;
};
