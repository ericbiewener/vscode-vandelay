import {
  extensions,
  window,
  workspace,
  ExtensionContext,
  env,
  Uri,
} from 'vscode'

const SUPPRESS_ALERT = false

export function showNewVersionAlert(context: ExtensionContext) {
  const extension = extensions.getExtension('edb.vandelay')
  if (!extension) return

  const { version } = extension.packageJSON
  const { globalState } = context
  const oldVersion: string | undefined = globalState.get('lastVersion')
  if (oldVersion !== version) globalState.update('lastVersion', version)
  if (!oldVersion || oldVersion === version || SUPPRESS_ALERT) return

  const config = workspace.getConfiguration('vandelay')
  if (!config.showNewVersionAlert) return

  const oldSemver = oldVersion.split('.')
  const newSemver = version.split('.')
  // Only compare major and minor versions
  if (
    newSemver[0] < oldSemver[0] ||
    (newSemver[0] === oldSemver[0] && newSemver[1] < oldSemver[1])
  )
    return

  const CHANGELOG = 1

  const msg =
    newSemver[0] > oldSemver[0]
      ? '🍔 VANDELAY BREAKING CHANGES: See Changelog.'
      : 'Vandelay has been updated. Check out the new features!'

  window
    .showInformationMessage(
      msg,
      { title: 'View Changelog', id: CHANGELOG },
      { title: "Don't show this again", id: 'noshow' }
    )
    .then(btn => {
      if (!btn) return
      if (btn.id === CHANGELOG) {
        env.openExternal(
          Uri.parse(
            'https://github.com/ericbiewener/vscode-vandelay/blob/master/CHANGELOG.md'
          )
        )
      } else {
        config.update('showNewVersionAlert', false, true)
      }
    })
}
