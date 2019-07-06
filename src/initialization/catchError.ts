import { window } from 'vscode'

/*
 * VS Code has an error swallowing problem, so we catch and manually log.
 */
export function catchError(fn: (...args: any[]) => any) {
  return async function(...args: any[]) {
    try {
      const result = await fn(...args)
      return result
    } catch (e) {
      console.error(e)
      window.showErrorMessage(
        'Vandelay extension error! Please run the "Toggle Developer Tools" VS Code command and post the stacktrace at https://github.com/ericbiewener/vscode-vandelay.'
      )
      throw e
    }
  }
}
