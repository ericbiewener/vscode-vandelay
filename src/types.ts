export type Obj = { [k: string]: any }

export type ExportDatum = {
  isExtraImport?: boolean,
}

export type ExportData = {
  [path: string]: ExportDatum
}

// Divide type into stuff that came from plugin config vs other? And then do PluginConfig & ...?
export type Plugin = {
  language: string,
  configFile: string,
  projectRoot: string,
  includePaths: string[],
  excludePatterns: (string | RegExp)[],
  processCachedData?(data: any): any,
  shouldIncludeImport(absImportPath: string, activeFilepath: string): boolean,
  cacheFile(plugin: Plugin, path: string, data: any): any
}
