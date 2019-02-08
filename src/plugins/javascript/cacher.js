const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
const { getFilepathKey } = require("../../utils");
const { basename, isPathNodeModule } = require("./utils");
const { parseImports, exportRegex } = require("./regex");

function processDefaultName(plugin, defaultName, importPath) {
  if (!plugin.processDefaultName) return defaultName;
  return plugin.processDefaultName(importPath) || defaultName;
}

function cacheFile(plugin, filepath, data = { _extraImports: {} }) {
  const fileExports = {};
  const fileText = fs.readFileSync(filepath, "utf8");
  const imports = parseImports(plugin, fileText);

  for (const importData of imports) {
    if (isPathNodeModule(plugin, importData.path)) {
      const existing = data._extraImports[importData.path] || {};
      data._extraImports[importData.path] = existing;
      if (importData.default) {
        existing.default = processDefaultName(
          plugin,
          importData.default,
          importData.path
        );
      }
      if (importData.named)
        existing.named = _.union(existing.named, importData.named);
      if (importData.types)
        existing.types = _.union(existing.types, importData.types);
    } else if (importData.default && importData.default.startsWith("* as")) {
      // import * as Foo from...
      const pathKey = getFilepathKey(
        plugin,
        path.resolve(path.dirname(filepath), `${importData.path}.js`) // Just guess at the file extension. Doesn't actually matter if it's right.
      );
      const existing = data[pathKey] || {};
      if (existing.default) continue; // don't overwrite default if it already exists
      data[pathKey] = existing;
      existing.default = importData.default;
    }
  }

  let match;

  const mainRegex = plugin.useES5
    ? exportRegex.moduleExports
    : exportRegex.standard;

  while ((match = mainRegex.exec(fileText))) {
    if (match[1] === "default" || (plugin.useES5 && match[1])) {
      const proposedName = filepath.endsWith("index.js")
        ? basename(path.dirname(filepath))
        : basename(filepath);
      fileExports.default = processDefaultName(plugin, proposedName, filepath);
    } else if (!plugin.useES5 && !match[2] && !match[1].endsWith(",")) {
      // endsWith(',') — it's actually a reexport
      // export myVar  |  export myVar from ...
      fileExports.named = fileExports.named || [];
      fileExports.named.push(match[1]);
    } else if (plugin.useES5 && match[2]) {
      fileExports.named = fileExports.named || [];
      // If any array or object exports were defined inline, strip those out so that our comm-based
      // string splitting will correctly split after each export
      const text = match[2]
        .replace(/\[[^]*?\]/gm, "")
        .replace(/{[^]*?}/gm, "")
        .replace(/\s/g, "");
      fileExports.named.push(
        ..._.compact(text.split(",")).map(exp => exp.split(":")[0])
      );
    } else if (match[2] && match[2] !== "from") {
      // from — it's actually a reexport
      const key = match[1] === "type" ? "types" : "named";
      fileExports[key] = fileExports[key] || [];
      fileExports[key].push(match[2]);
    }
  }

  if (!plugin.useES5) {
    while ((match = exportRegex.fullRexport.exec(fileText))) {
      fileExports.all = fileExports.all || [];
      fileExports.all.push(match[1]);
    }

    // match[1] = default
    // match[2] = export names
    // match[3] = path
    while ((match = exportRegex.selectiveRexport.exec(fileText))) {
      if (!fileExports.reexports) fileExports.reexports = {};
      const subPath = match[3];
      if (!fileExports.reexports[subPath]) fileExports.reexports[subPath] = [];
      const reexports = fileExports.reexports[subPath];

      if (match[1]) {
        fileExports.named = fileExports.named || [];
        fileExports.named.push(match[1]);
        // 'default' string used so that `buildImportItems` can suppress the subfile's default
        // export regardless of how the reexport location has named the variable
        // (https://goo.gl/SeH6MV). `match[1]` needed so that `buildImportItems` can suppress it when
        // importing from an adjacent/subfile (https://goo.gl/Ayk5Cg)
        reexports.push("default", match[1]);
      }

      for (const exp of match[2].split(",")) {
        const trimmed = exp.trim();
        if (!trimmed) continue;
        const words = trimmed.split(/ +/);
        const isType = words[0] === "type";
        const key = isType ? "types" : "named";
        reexports.push(words[isType ? 1 : 0]);
        fileExports[key] = fileExports[key] || [];
        fileExports[key].push(_.last(words));
      }
    }
  }

  if (!_.isEmpty(fileExports)) {
    const pathKey = getFilepathKey(plugin, filepath);
    const existing = data[pathKey];
    // An existing default could be there from an earlier processed "import * as Foo from.." See https://goo.gl/JXXskw
    if (existing && existing.default && !fileExports.default)
      fileExports.default = existing.default;
    data[pathKey] = fileExports;
  }

  exportRegex.standard.lastIndex = 0;
  exportRegex.fullRexport.lastIndex = 0;
  exportRegex.selectiveRexport.lastIndex = 0;

  return data;
}

/**
 * 1. Process reexports to add the actual export names to the file keys in which they're reexported.
 * 2. Flag all these as having been rexported so that `buildImportItems` can decide when to suppress
 *    them.
 * 3. Flag the reexports in their original file keys as having been reexported for the same reason.
 *
 * Note: If the reexport has been renamed (`export { x as y }`), it will not get filtered out when
 * importing from an adjacent/subfile. While solveable, this is probably an edge case to be ignored
 * (not to mention an undesireable API being created by the developer)
 */
function processCachedData(data) {
  _.each(data, (fileData, mainFilepath) => {
    const reexportNames = [];

    if (fileData.reexports) {
      _.each(fileData.reexports, (exportNames, subfilePath) => {
        reexportNames.push(...exportNames);
        const subfileExports = getSubfileData(mainFilepath, subfilePath, data);
        if (subfileExports) {
          if (!subfileExports.reexported) {
            subfileExports.reexported = {
              reexports: [],
              reexportPath: mainFilepath
            };
          }
          subfileExports.reexported.reexports.push(...exportNames);
        }
      });
    }

    if (fileData.all) {
      fileData.all.forEach(subfilePath => {
        const subfileExports = getSubfileData(mainFilepath, subfilePath, data);
        if (!subfileExports || !subfileExports.named) return;
        if (fileData.named) {
          fileData.named.push(...subfileExports.named);
        } else {
          fileData.named = subfileExports.named;
        }
        reexportNames.push(...subfileExports.named);
        // flag names in original export location
        subfileExports.reexported = {
          reexports: subfileExports.named,
          reexportPath: mainFilepath
        };
      });

      delete fileData.all;
    }

    // flag names in `index.js` key
    if (reexportNames.length) {
      fileData.reexports = reexportNames;
    } else {
      delete fileData.reexports;
    }
  });

  return data;
}

function getSubfileData(mainFilepath, filename, data) {
  const filepathWithoutExt = path.join(path.dirname(mainFilepath), filename);
  for (const ext of [".js", ".jsx"]) {
    const subfileExports = data[filepathWithoutExt + ext];
    if (subfileExports) return subfileExports;
  }
}

module.exports = {
  cacheFile,
  processCachedData
};
