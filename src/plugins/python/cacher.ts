import fs from "fs-extra"
import _ from "lodash"
import { getFilepathKey } from "../../utils"
import { isPathPackage } from "./utils"
import { parseImports } from "./regex"

export function cacheFile(plugin, filepath, data, extraImports) {
  const fileText = fs.readFileSync(filepath, "utf8");
  const imports = parseImports(fileText);

  for (const importData of imports) {
    if (isPathPackage(plugin, importData.path)) {
      const existing = extraImports[importData.path] || {};
      extraImports[importData.path] = existing;
      if (importData.imports) {
        existing.exports = _.union(existing.exports, importData.imports);
      } else {
        existing.importEntirePackage = true;
      }
    }
    // If there are imports, than they'll get added to the cache when that file gets cached.
    else if (!importData.imports) {
      data[importData.path] = { importEntirePackage: true };
    }
  }

  const classes = [];
  const functions = [];
  const constants = [];
  const lines = fileText.split("\n");

  for (const line of lines) {
    const words = line.split(" ");
    const word0 = words[0];
    const word1 = words[1];

    if (word0 === "class") {
      classes.push(trimClassOrFn(word1));
    } else if (word0 === "def") {
      // Don't export private functions
      if (!word1.startsWith("_")) functions.push(trimClassOrFn(word1));
    } else if (word1 === "=" && word0.toUpperCase() === word0) {
      constants.push(word0);
    }
  }

  // This order of class, function, constant will be maintained when picking an import from the list
  const exp = [...classes, ...functions, ...constants];
  if (exp.length) data[getFilepathKey(plugin, filepath)] = { exports: exp };
}

function trimClassOrFn(str) {
  return str.slice(0, str.indexOf("("));
}
