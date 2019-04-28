import _ from 'lodash'
import {
  extensions,
  window,
  workspace,
  ExtensionContext,
  env,
  Uri,
} from 'vscode'
import { Plugin } from './types'
import { last } from './utils'

const SUPPRESS_ALERT = false

enum AlertTypes {
  INFO,
  WARNING,
  ERROR,
}

type AlertType = AlertTypes.INFO | AlertTypes.WARNING | AlertTypes.ERROR

const CHANGELOG_BUTTON_CONFIG = {
  title: 'View Changelog',
  action: () =>
    env.openExternal(
      Uri.parse(
        'https://github.com/ericbiewener/vscode-vandelay/blob/master/CHANGELOG.md'
      )
    ),
}

export async function showNewVersionAlert(context: ExtensionContext) {
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
  if (!isMajor && !config.showNewVersionAlert) return

  show

  showAlertWithActions(
    AlertTypes.INFO,
    'Vandelay has been updated. Check out the new features!',
    CHANGELOG_BUTTON_CONFIG,
    {
      title: "Don't show this again",
      action: () => config.update('showNewVersionAlert', false, true),
    }
  )

  if (btn) btn.action()
}

export async function showNewVersionConfigAlert(plugin: Plugin) {
  if (plugin.hasOwnProperty('processDefaultName')) {
    const btn = await window.showWarningMessage(
      'The Vandelay configuration option "processDefaultName" has been removed.',
      { modal: true },
      CHANGELOG_BUTTON_CONFIG
    )

    if (btn) btn.action()
  }
}

type ActionT = { title: string; action: () => void }
async function showAlertWithActions(
  alertType: AlertType,
  message: string,
  ...actions: ActionT[]
) {
  let modal = false
  if (typeof last(actions) === 'boolean') {
    modal = actions.pop()
  }

  const fn =
    alertType === AlertTypes.ERROR
      ? 'showErrorMessage'
      : alertType === AlertTypes.WARNING
      ? 'showWarningMessage'
      : 'showInformationMessage'

  const btn = await window[fn](message, { modal }, ...actions)

  if (btn) return btn.action()
}
