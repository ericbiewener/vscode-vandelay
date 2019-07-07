import { jsConfig } from './plugins/javascript/config'
import { pyConfig } from './plugins/python/config'
import { PluginConfig } from './types'

// Can't put this in main.js because it will create circular dependency issues that Webpack can't resolve.

export const pluginConfigs: { [lang: string]: PluginConfig } = {
  [jsConfig.language]: jsConfig,
  [pyConfig.language]: pyConfig,
}
