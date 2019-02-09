import _ from "lodash"
import { Range, Uri, window } from "vscode"
import { strUntil } from "../../utils"
import { getNewLine } from "./importing/importer"
import { importRegex, parseImports } from "./regex"

export async function removeUnusedImports(plugin) {
  const diagnostics = getDiagnostics(d => d.code === "F401");
  for (const filepath in diagnostics) {
    const editor = await window.showTextDocument(Uri.file(filepath), {
      preserveFocus: true,
      preview: false
    });
    const { document } = editor;
    const fullText = document.getText();
    const fileImports = parseImports(fullText);
    const changes = {};

    for (const diagnostic of diagnostics[filepath]) {
      // If importing entire package, remove whole line
      if (
        importRegex.entirePackage.test(
          document.lineAt(diagnostic.range.start.line)
        )
      ) {
        changes[importMatch.path] = { exports: [], match: importMatch };
        continue;
      }

      const offset = document.offsetAt(diagnostic.range.start);
      const importMatch = fileImports.find(
        i => i.start <= offset && i.end >= offset
      );
      if (!importMatch) return;

      const { imports } = changes[importMatch.path] || importMatch;
      // diagnostic.range only points to the start of the line, so we have to parse the import name
      // from diagnostic.message
      const unusedImport = strUntil(_.last(diagnostic.message.split(".")), "'");

      changes[importMatch.path] = {
        imports: imports ? imports.filter(n => n !== unusedImport) : [],
        match: importMatch
      };
    }

    const orderedChanges = _.sortBy(changes, c => -c.match.start);

    // We make changes to a string outside of the edit builder so that we don't have to worry about
    // overlapping edit ranges
    const oldTextEnd = orderedChanges[0].match.end + 1; // +1 in case we need to remove the following \n
    let newText = fullText.slice(0, oldTextEnd); // could just do this on the fullText

    for (const change of orderedChanges) {
      const { imports, match } = change;
      const newLine = imports.length
        ? getNewLine(plugin, match.path, imports)
        : "";

      let { end } = match;
      if (!newLine) end += newText[end + 1] === "\n" ? 2 : 1;
      newText = newText.slice(0, match.start) + newLine + newText.slice(end);
    }

    await editor.edit(builder => {
      builder.replace(
        new Range(document.positionAt(0), document.positionAt(oldTextEnd)),
        newText
      );
    });

    await document.save();
  }
}
