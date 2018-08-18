<p align="center"><img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay/master/artwork/logo.png" width="128" height="112" align="center" /></p>
<h1 align="center">Vandelay</h1>

<p align="center">
  <strong>VS Code extension for automating imports. Languages supported via plugins.</strong>.
  <br />
  Official plugins currently exist for <a href="https://github.com/ericbiewener/vscode-vandelay-js">JavaScript</a> &amp; <a href="https://github.com/ericbiewener/vscode-vandelay-py">Python</a>.
</p>

<br />
<p align="center">
<img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay-js/master/artwork/animation.gif" width="757" height="426" align="center" />
</p>
<br />


<p align="center">
    <img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay/master/artwork/logo.png" width="128" height="112" />
</p>

<p align="center">
  VS Code extension for automating imports. Languages supported via plugins.
  <br />
  
</p>

## Overview
<a href="https://www.youtube.com/watch?v=W4AN8Eb2LL0&t=2m10s" target="_blank"><img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay/master/artwork/video.jpg" alt="He's an importer exporter" width="240" align="right" /></a>
Importing code is annoying and the current VS Code tooling around it isn't good enough.
This plugin keeps track of all available imports and allows you to quickly import them following
whatever style guide your project requires for how import statements get written (see
[Configuration](#configuration)). Multi-root workspaces are supported.

## How to Use
By itself, Vandelay doesn't do anything. You need to download a specific language plugin for
Vandelay, such as [JavaScript](https://github.com/ericbiewener/vscode-vandelay-js) or
[Python](https://github.com/ericbiewener/vscode-vandelay-py). Installing one of those plugins will
automatically install this core Vandelay plugin as a dependency.

## Writing Your Own Plugin
Plugins may be written for any language. Take a look at how one of the official plugins
[initializes](https://github.com/ericbiewener/vscode-vandelay-js/blob/master/src/index.js) for a full
example. The basics are:

```js
exports.activate = async function activate(context) {
  const vandelay = await extensions.getExtension('edb.vandelay').activate()

  vandelay.registerPlugin({
    language: 'js',
    cacheFile: () => {},
    buildImportItems: () => {},
    insertImport: () => {},
    finalizePlugin(plugin) {
      // Once the core Vandelay extension has finished initializing,
      // you can do some final work here if needed
    },
    // Add any other custom configuration defaults your plugin requires
  })
}
```

### `language: string`
The file extension that your plugin should handle. Specifying `js` will also include `jsx`.

### `cacheFile: (plugin: PluginObj, absPath: string, exportData: {}) => exportData: {}`
Cache the available exports for the file with path `absPath`. `exportData` should be mutated with
the additional data and ultimately returned from the function. There are only two requirements for the
structure of `exportData`:

    1. The first level of keys should be
                plugin.cacheFile(plugin, fullPath, data)


# UTILS

- insertImport -> returns a promise (must be awaited?)

# other plugin info

importPosition that is passed to sharedUtils.insertImport must have the following properties:
match: (should have a start & end properties)
indexModifier: 0, 1, -1,
isFirstImport?: boolean. if true, will add extra line break after import


## Configuration
