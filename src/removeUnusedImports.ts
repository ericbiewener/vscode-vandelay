import { window } from "vscode";
import { getPluginForActiveFile } from "./utils";

export async function removeUnusedImports() {
  const plugin = getPluginForActiveFile();
  if (!plugin) return;

  const originalEditor = window.activeTextEditor;
  await plugin.removeUnusedImports(plugin);
  await window.showTextDocument(originalEditor.document.uri);
}
