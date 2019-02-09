import opn from "opn"
import { extensions, window, workspace } from "vscode"

function showNewVersionAlert(context, extConfig = {}) {
  const {
    name = "Vandelay",
    changelogUrl = "https://github.com/ericbiewener/vscode-vandelay/blob/master/CHANGELOG.md",
    extensionIdentifier = "edb.vandelay",
    suppressAlert = false
  } = extConfig;

  const { globalState } = context;
  const { version } = extensions.getExtension(extensionIdentifier).packageJSON;
  const oldVersion = globalState.get("lastVersion");
  if (oldVersion !== version) globalState.update("lastVersion", version);
  if (!oldVersion || oldVersion === version || suppressAlert) return;

  // Extensions don't get their own `showNewVersionAlert`. This is a global Vandelay setting.
  const config = workspace.getConfiguration("vandelay");
  if (!config.showNewVersionAlert) return;

  const oldSemver = oldVersion.split(".");
  const newSemver = version.split(".");
  // Only compare major and minor versions
  if (
    newSemver[0] < oldSemver[0] ||
    (newSemver[0] === oldSemver[0] && newSemver[1] < oldSemver[1])
  )
    return;

  const CHANGELOG = "CHANGELOG";
  // TODO: use https://code.visualstudio.com/updates/v1_31#_open-resources-in-a-browser
  // TODO: all async/await
  window
    .showInformationMessage(
      `${name} has been updated. Check out the new features!`,
      { title: "View Changelog", id: CHANGELOG },
      { title: "Don't show this again", id: "noshow" }
    )
    .then(btn => {
      if (btn.id === CHANGELOG) {
        opn(changelogUrl);
      } else {
        config.update("showNewVersionAlert", false, true);
      }
    });
}

module.exports = {
  showNewVersionAlert
};
