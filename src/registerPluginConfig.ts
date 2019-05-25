import { PluginConfig } from './types'

// Can't put this in main.js because it will create circular dependency issues that Webpack can't resolve.

export const pluginConfigs: { [lang: string]: PluginConfig } = {}

export function registerPluginConfig(config: PluginConfig) {
  pluginConfigs[config.language] = config
}
