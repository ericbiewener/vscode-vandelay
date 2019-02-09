import _ from "lodash"
import { Range, Uri, window } from "vscode"
import { getDiagnostics } from "../../utils"
import { getNewLine } from "./importing/getNewLine"
import { parseImports } from "./regex"

export async function removeUnusedImports(plugin) {
  const diagnostics = getDiagnostics(d => d.code === "no-unused-vars");

  for (const filepath in diagnostics) {
    const editor = await window.showTextDocument(Uri.file(filepath), {
      preserveFocus: true,
      preview: false
    });
    const { document } = editor;
    const fullText = document.getText();
    const fileImports = parseImports(plugin, fullText);
    const changes = {};

    for (const diagnostic of diagnostics[filepath]) {
      const offset = document.offsetAt(diagnostic.range.start);
      const importMatch = fileImports.find(
        i => i.start <= offset && i.end >= offset
      );
      if (!importMatch) continue;

      const existingChange = changes[importMatch.path];
      const { default: defaultImport, named, types } =
        existingChange || importMatch;
      const unusedImport = document.getText(diagnostic.range);

      changes[importMatch.path] = {
        default: defaultImport !== unusedImport ? defaultImport : null,
        named: named ? named.filter(n => n !== unusedImport) : [],
        types: types ? types.filter(n => n !== unusedImport) : [],
        match: importMatch
      };
    }

    const orderedChanges = _.sortBy(changes, c => -c.match.start);

    await editor.edit(builder => {
      for (const change of orderedChanges) {
        const { default: defaultImport, named, types, match } = change;
        const newLine =
          defaultImport || named.length || types.length
            ? getNewLine(plugin, match.path, change)
            : "";

        builder.replace(
          new Range(
            document.positionAt(newLine ? match.start : match.start - 1), // Delete previous \n if newLine is empty
            document.positionAt(match.end)
          ),
          newLine
        );
      }
    });

    await document.save();
  }
}
