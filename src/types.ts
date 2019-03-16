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

type ExcludePatterns = (string | RegExp)[];

// FIXME: not sure that this is right. Not sure that the division of all these configs is right.
export type UserConfig = {
  includePaths: string[];
  maxImportLineLength?: number;
  nonModulePaths?: string[];
  useES5?: boolean;
  preferTypeOutside?: boolean;
  padCurlyBraces?: boolean;
  useSingleQuotes?: boolean;
  useSemicolons?: boolean;
  multilineImportStyle?: "single" | "multiple";
  trailingComma?: boolean;
  importGroups?: string[][];
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

  // JS
  useSingleQuotes: boolean;
  padCurlyBraces: boolean;
  useSemicolons: boolean;
  trailingComma: boolean;
  multilineImportStyle: "single" | "multiple";
  excludePatterns: ExcludePatterns;
};

export type Plugin = UserConfig &
  PluginConfig & {
    maxImportLineLength: number;
    configFile: string;
    cacheFilePath: string;
    projectRoot: string;
    cacheDirPath: string;
  };
