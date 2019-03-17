import {
  UserConfig,
  PluginConfig,
  DefaultPluginConfig,
  RuntimePluginConfig,
  RichQuickPickItem
} from "../../types";

export enum ExportType {
  default = 0,
  named = 1,
  type = 2
}

export type RichQuickPickItemJs = RichQuickPickItem & {
  absImportPath: string;
  exportType: ExportType;
};

/**
 * Cached Data Structurs
 */
// FIXME: make sure these are all correct

export type FileExportsJs = {
  default?: string | null | undefined;
  named: string[];
  types: string[];
};

export type ExportDatumJs = FileExportsJs & {
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

export type NonFinalExportDatumJs = ExportDatumJs & {
  reexportsToProcess?: ReexportsToProcess;
};

export type NonFinalExportDataJs = { [path: string]: NonFinalExportDatumJs };

export type ExportDataImportsJs = { [path: string]: FileExportsJs };
export type ExportDataExportsJs = { [path: string]: ExportDatumJs };
// FIXME: remove isExtraImport?
export type MergedExportDataJs = {
  [path: string]: ExportDatumJs & { isExtraImport?: boolean };
};

export type ExportDataJs = {
  imp: ExportDataImportsJs;
  exp: ExportDataExportsJs;
};

// FIXME: remove isExtraImport?
export type CachingDataJs = {
  exp: NonFinalExportDataJs;
  imp: {
    [path: string]: FileExportsJs & { isExtraImport?: boolean };
  };
};

/**
 * Plugin Config
 */

export type PluginConfigJs = PluginConfig & {
  language: "js";
  useSingleQuotes: boolean;
  padCurlyBraces: boolean;
  useSemicolons: boolean;
  trailingComma: boolean;
  multilineImportStyle: "single" | "multiple";
  buildImportItems(
    plugin: PluginJs,
    data: MergedExportDataJs,
    sortedKeys: string[]
  ): RichQuickPickItemJs[];
  insertImport(plugin: PluginJs, selection: RichQuickPickItemJs): Promise<any>;
};

export type UserConfigJs = UserConfig & {
  useES5?: boolean;
  preferTypeOutside?: boolean;
  padCurlyBraces?: boolean;
  useSingleQuotes?: boolean;
  useSemicolons?: boolean;
  multilineImportStyle?: "single" | "multiple";
  trailingComma?: boolean;
  importGroups?: string[];
};

export type PluginJs = DefaultPluginConfig &
  PluginConfigJs &
  UserConfigJs &
  RuntimePluginConfig;
