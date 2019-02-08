const _ = require("lodash");
const { strUntil } = require("../../utils");

/**
 * Regex must end with `.*` after last capturing group to ensure that we capture the full line. This
 * is necessary so that the `end` property in the results is the correct character.
 *
 * Matching groups:
 *    1. default import OR outside `type` declaration
 *    2. named/type imports
 *    3. path
 */
const importRegex = /^import +?([^{]+?[, ])? *(?:{([^]*?)} +)?from +["'](.*)["'].*/gm;
const requireRegex = /^(?:const|let|var) +(\w+)?(?:{([^]*?)})? *= *require\( *['"](.*?)['"].*/gm;

function parseImports(plugin, text) {
  const regex = plugin.useES5 ? requireRegex : importRegex;
  const imports = [];
  let match;
  while ((match = regex.exec(text))) {
    // unassigned import: `import "something"`
    if (match[1] && (match[1].startsWith("'") || match[1].startsWith('"'))) {
      // Must reset `lastIndex` to the end of the unassigned import statement because the match will
      // have gone beyond it
      const unassignedImportEnd = match[0].indexOf("\n");
      if (unassignedImportEnd > -1)
        regex.lastIndex -= match[0].length - unassignedImportEnd;
      continue;
    }
    const isTypeOutside = match[2] && match[1] === "type ";
    const results = {
      path: match[3],
      start: match.index,
      end: match.index + match[0].length,
      default:
        isTypeOutside || !match[1] ? null : strUntil(match[1], ",").trim(),
      isTypeOutside
    };
    if (match[2]) {
      const namedAndTypes = _.compact(
        match[2]
          .replace(/{}]/g, "")
          .split(",")
          .map(i => i.trim())
      );

      if (isTypeOutside) {
        results.types = namedAndTypes;
      } else {
        const groups = _.partition(namedAndTypes, i => i.startsWith("type "));
        if (groups[0].length)
          results.types = groups[0].map(i => i.slice(5).trim());
        if (groups[1].length) results.named = groups[1];
      }
    }
    imports.push(results);
  }

  regex.lastIndex = 0;
  return imports;
}

const commentRegex = /^(?:[ \t]*\/\/.*|[ \t]*\/\*[^]*?\*\/)/gm;

const exportRegex = {
  // `standard` also captures selective reexports that include a default reexport. It is the
  // responsibility of `cacheFile` to handle this when processing these improts.
  standard: /^export +(\w+,?)(?: +(\w+))?/gm,
  fullRexport: /^export +\*.+?['"](.+)['"]/gm,
  selectiveRexport: /^export +(\w*),* *{([^]+?)}.+?['"](.+)['"]/gm,
  moduleExports: /^module\.exports *= *(\w+)?(?:{([^]*?)})?.*/gm
};

module.exports = {
  parseImports,
  exportRegex,
  commentRegex
};
