const opn = require('opn')
const { extensions, window, workspace } = require('vscode')

function showNewVersionAlert({ globalState }) {
  const version = extensions.getExtension('edb.vandelay').packageJSON.version
  const oldVersion = globalState.get('lastVersion')
  if (!oldVersion) return

  const oldSemver = oldVersion.split('.')
  const newSemver = version.split('.')
  // Only compare major and minor versions
  if (
    newSemver[0] > oldSemver[0] ||
    (newSemver[0] === oldSemver[0] && newSemver[1] > oldSemver[1])
  ) {
    const config = workspace.getConfiguration('vandelay')
    if (config.showNewVersionAlert) {
      const CHANGELOG = 'CHANGELOG'
      window
        .showInformationMessage(
          'Vandelay has been updated. Check out the new features!',
          { title: 'View Changelog', id: CHANGELOG },
          { title: "Don't show this again", id: 'noshow' }
        )
        .then(btn => {
          if (btn.id === CHANGELOG) {
            opn(
              'https://github.com/ericbiewener/vscode-vandelay/blob/master/CHANGELOG.md'
            )
          } else {
            config.update('showNewVersionAlert', false, true)
          }
        })
      globalState.update('lastVersion', version)
    }
  }
}

module.exports = {
  showNewVersionAlert,
}
