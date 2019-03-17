import {
  UserConfig,
  PluginConfig,
  DefaultPluginConfig,
  RuntimePluginConfig,
  RichQuickPickItem
} from "../../types";

/**
 * Cached Data Structures
 */
// FIXME: remove isExtraImport?

export type FileExportsPy = {
  importEntirePackage?: boolean;
  exports?: string[];
};

export type ExportDatumPy = FileExportsPy & {
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

export type ReexportsToProcess = {
  fullModules: string[];
  selective: { [path: string]: string[] };
};

export type NonFinalExportDatumPy = ExportDatumPy & {
  reexportsToProcess?: ReexportsToProcess;
};

export type NonFinalExportDataPy = { [path: string]: NonFinalExportDatumPy };

export type ExportDataImportsPy = { [path: string]: FileExportsPy };
export type ExportDataExportsPy = { [path: string]: ExportDatumPy };
export type MergedExportDataPy = {
  [path: string]: ExportDatumPy & { isExtraImport?: boolean };
};

export type ExportDataPy = {
  imp: ExportDataImportsPy;
  exp: ExportDataExportsPy;
};

export type CachingDataPy = {
  exp: NonFinalExportDataPy;
  imp: {
    [path: string]: FileExportsPy & { isExtraImport?: boolean };
  };
};

/**
 * Plugin Config
 */

export type PluginConfigPy = PluginConfig & {
  language: "py";
};

export type UserConfigPy = UserConfig & {
  importGroups?: string[][];
};

export type PluginPy = DefaultPluginConfig &
  PluginConfigPy &
  UserConfigPy &
  RuntimePluginConfig;
