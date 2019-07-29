import _ from 'lodash'
import { window } from 'vscode'
import { PLUGINS } from '../plugins'
import { UnusedExports } from '../types'

export async function findUnusedExports() {
  const unusedExports: UnusedExports = {}

  for (const lang in PLUGINS) {
    const plugin = PLUGINS[lang] as any
    if (plugin.findUnusedExports) {
      Object.assign(unusedExports, await plugin.findUnusedExports(plugin))
    }
  }

  if (_.isEmpty(unusedExports)) {
    window.showInformationMessage('No unused exports found!')
    return
  }

  console.log(unusedExports)
}
