import _ from 'lodash'
import {
  extensions,
  window,
  workspace,
  ExtensionContext,
  env,
  Uri,
} from 'vscode'
import { alertWithActions } from './alertWithActions'
import { Plugin } from './types'

const SUPPRESS_ALERT = false

const CHANGELOG_BUTTON_CONFIG = {
  title: 'View Changelog',
  action: () =>
    env.openExternal(
      Uri.parse(
        'https://github.com/ericbiewener/vscode-vandelay/blob/master/CHANGELOG.md'
      )
    ),
}

export async function alertNewVersion(context: ExtensionContext) {
  const extension = extensions.getExtension('edb.vandelay')
  if (!extension) return

  const { version } = extension.packageJSON
  const { globalState } = context
  const oldVersion: string | undefined = globalState.get('lastVersion')
  if (oldVersion !== version) globalState.update('lastVersion', version)
  if (!oldVersion || oldVersion === version || SUPPRESS_ALERT) return

  const oldSemver = oldVersion.split('.')
  const newSemver = version.split('.')
  // Only compare major and minor versions
  if (
    newSemver[0] < oldSemver[0] ||
    (newSemver[0] === oldSemver[0] && newSemver[1] < oldSemver[1])
  )
    return

  const isMajor = newSemver[0] > oldSemver[0]

  const config = workspace.getConfiguration('vandelay')
  if (!isMajor && !config.alertNewVersion) return

  alertWithActions({
    msg: 'Vandelay has been updated. Check out the new features!',
    actions: [
      CHANGELOG_BUTTON_CONFIG,
      {
        title: "Don't show this again",
        action: () => config.update('alertNewVersion', false, true),
      },
    ],
  })
}

export async function alertNewVersionConfig(plugin: Plugin) {
  if (plugin.hasOwnProperty('processDefaultName')) {
    alertWithActions({
      msg:
        'The Vandelay configuration option "processDefaultName" has been removed.',
      modal: true,
      actions: [CHANGELOG_BUTTON_CONFIG],
    })
  }
}
