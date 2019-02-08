const { window } = require("vscode");
const path = require("path");
const { getExportDataKeysByCachedDate } = require("../../../utils");

const ExportType = {
  default: 0,
  named: 1,
  type: 2
};

function buildImportItems(plugin, exportData) {
  const { projectRoot, shouldIncludeImport } = plugin;
  const activeFilepath = window.activeTextEditor.document.fileName;
  const items = [];

  const sortedKeys = getExportDataKeysByCachedDate(exportData);
  for (const importPath of sortedKeys) {
    let absImportPath = path.join(projectRoot, importPath);
    if (absImportPath === activeFilepath) continue;
    if (
      shouldIncludeImport &&
      !shouldIncludeImport(absImportPath, activeFilepath)
    ) {
      continue;
    }

    const data = exportData[importPath];
    let defaultExport;
    let namedExports;
    let typeExports;

    // Filter out reexported names
    if (
      // If the current file has imports that were reexported
      data.reexported &&
      // Only import from index.js if active file not adjacent to nor in a subdirectory relative to the import's
      // reexport path. Can't simply test to make sure it's in a subdirectory relative to the import's true path,
      // because the import might be getting reexported multiple directories higher up, in which case it should not be
      // imported from that reexport location if the active file is adjacent/in a subdirectory.
      !activeFilepath.startsWith(
        path.join(
          plugin.projectRoot,
          path.dirname(data.reexported.reexportPath)
        )
      )
    ) {
      const { reexports } = data.reexported;
      if (data.default && !reexports.includes("default"))
        defaultExport = data.default;
      if (data.named)
        namedExports = data.named.filter(exp => !reexports.includes(exp));
      if (data.types)
        typeExports = data.types.filter(exp => !reexports.includes(exp));
    } else {
      defaultExport = data.default;

      if (
        // If some of the names are reexports from other files (e.g. it's an index.js file) and the active file is
        // adjacent to or in a subdirectory of the import file, eliminate the reexports because they'll just be imported
        // from their original locations
        data.reexports &&
        activeFilepath.startsWith(path.dirname(absImportPath))
      ) {
        namedExports = data.named
          ? data.named.filter(n => !data.reexports.includes(n))
          : null;
        typeExports = data.types
          ? data.types.filter(n => !data.reexports.includes(n))
          : null;
      } else {
        defaultExport = data.default;
        namedExports = data.named;
        typeExports = data.types;
      }
    }

    const ext = path.extname(importPath);
    const importPathNoExt = ext ? importPath.slice(0, -ext.length) : importPath;

    if (
      absImportPath.endsWith("index.js") ||
      absImportPath.endsWith("index.jsx")
    ) {
      absImportPath = path.dirname(absImportPath);
    }

    if (defaultExport) {
      items.push({
        label: defaultExport,
        description: importPathNoExt,
        exportType: ExportType.default,
        isExtraImport: data.isExtraImport,
        absImportPath
      });
    }

    if (namedExports) {
      namedExports.forEach(exportName => {
        items.push({
          label: exportName,
          description: importPathNoExt,
          exportType: ExportType.named,
          isExtraImport: data.isExtraImport,
          absImportPath
        });
      });
    }

    if (typeExports) {
      typeExports.forEach(exportName => {
        items.push({
          label: exportName,
          description: importPathNoExt,
          exportType: ExportType.type,
          isExtraImport: data.isExtraImport,
          absImportPath
        });
      });
    }
  }

  return items;
}

function buildTypeImportItems(plugin, exportData) {
  return buildImportItems(plugin, exportData).filter(
    e => e.exportType === ExportType.type
  );
}

module.exports = {
  buildImportItems,
  buildTypeImportItems,
  ExportType
};
