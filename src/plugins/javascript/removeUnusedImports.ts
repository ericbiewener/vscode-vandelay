import _ from "lodash";
import { Range, Uri, window } from "vscode";
import { getDiagnosticsForAllEditors } from "../../utils";
import { getNewLine } from "./importing/getNewLine";
import { parseImports, ParsedImport } from "./regex";
import { Plugin } from "../../types";

type Change = {
  default: string | null | undefined;
  named: string[];
  types: string[];
  match: ParsedImport;
};

export async function removeUnusedImports(plugin: Plugin) {
  const diagnostics = getDiagnosticsForAllEditors(
    d => d.code === "no-unused-vars"
  );

  for (const filepath in diagnostics) {
    const editor = await window.showTextDocument(Uri.file(filepath), {
      preserveFocus: true,
      preview: false
    });
    const { document } = editor;
    const fullText = document.getText();
    const fileImports = parseImports(plugin, fullText);
    const changes: Change[] = [];
    const changesByPath: { [path: string]: Change } = {};

    for (const diagnostic of diagnostics[filepath]) {
      const offset = document.offsetAt(diagnostic.range.start);
      const importMatch = fileImports.find(
        i => i.start <= offset && i.end >= offset
      );
      if (!importMatch) continue;

      const existingChange = changesByPath[importMatch.path];
      const { default: defaultImport, named, types } =
        existingChange || importMatch;
      const unusedImport = document.getText(diagnostic.range);

      const change = {
        default: defaultImport !== unusedImport ? defaultImport : null,
        named: named ? named.filter(n => n !== unusedImport) : [],
        types: types ? types.filter(n => n !== unusedImport) : [],
        match: importMatch
      };
      changesByPath[importMatch.path] = change;
      changes.push(change);
    }

    // FIXME: make sure this sort works. had to change it from lodash
    // Sort in reverse order so that modifying a line doesn't effect the other line locations that
    // need to be changed
    changes.sort((a, b) => (a.match.start < b.match.start ? 1 : -1));

    await editor.edit(builder => {
      for (const change of changes) {
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
