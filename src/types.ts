export type Obj = { [k: string]: string }

export type Plugin = {
  projectRoot: string,
  shouldIncludeImport(absImportPath: string, activeFilepath: string): boolean
}

export type ExportDatum = {
  isExtraImport?: boolean,
}

export type ExportData = {
  [path: string]: ExportDatum
}
