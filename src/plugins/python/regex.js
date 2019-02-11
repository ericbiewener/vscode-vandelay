const _ = require("lodash");

/**
 * Regexes must end with `.*` after last capturing group to ensure that we capture the full line.
 * This is necessary so that the `end` property in the results is the correct character.
 *
 * Matching groups:
 *    1. path
 *    2. imports
 */
// TODO: review regexes now that i am better at it...
// TODO: check for whether any `+` or `*` should be made non-greedy by adding whatever character they're looking for later on the line (e.g. by having an inline comment)
const importRegex = {
  entirePackage: /^import ([^\s]+)/gm,
  singleLine: /^from +(.+) +import +([^(#"\n\r]+).*/gm,
  multiline: /^from +?(.+) +?import +\(([\S\s]*?)\).*/gm
};

function parseImportsWithRegex(text, regex, replacer, imports = []) {
  let match;
  while ((match = regex.exec(text))) {
    const results = {
      path: match[1],
      start: match.index,
      end: match.index + match[0].length
    };
    if (match[2])
      results.imports = _.compact(match[2].replace(replacer, "").split(","));
    imports.push(results);
  }

  regex.lastIndex = 0;
  return imports;
}

function parseImports(text) {
  // Mutate imports
  const imports = parseImportsWithRegex(text, importRegex.entirePackage);
  parseImportsWithRegex(text, importRegex.singleLine, /\s/g, imports);
  parseImportsWithRegex(text, importRegex.multiline, /[\s()]/g, imports);
  return imports.sort((a, b) => a.start - b.start);
}

const commentRegex = /^(?:[ \t]*#|[ \t]*"""[^]*?""").*/gm;

module.exports = {
  parseImports,
  commentRegex,
  importRegex
};
