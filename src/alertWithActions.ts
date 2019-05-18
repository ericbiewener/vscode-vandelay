import { window } from 'vscode'

enum AlertTypes {
  INFO,
  WARNING,
  ERROR,
}

type AlertType = AlertTypes.INFO | AlertTypes.WARNING | AlertTypes.ERROR

type ActionT = { title: string; action: () => void }
type AlertConfigT = {
  alertType?: AlertType
  msg: string
  actions: ActionT[]
  modal?: boolean
}

export async function alertWithActions({
  alertType,
  msg,
  actions,
  modal,
}: AlertConfigT) {
  const fn =
    alertType === AlertTypes.ERROR
      ? 'showErrorMessage'
      : alertType === AlertTypes.WARNING
      ? 'showWarningMessage'
      : 'showInformationMessage'

  const btn = await window[fn](msg, { modal }, ...actions)

  if (btn) return btn.action()
}
