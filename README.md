<p align="center">
    <img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay/master/artwork/logo.svg" width="112" height="128" />
</p>

VS Code extension for automating imports. Languages supported via plugins. Official plugins currently exist for [JavaScript](https://github.com/ericbiewener/vscode-vandelay-js) & [Python](https://github.com/ericbiewener/vscode-vandelay-py).

## Configuration
Vandelay allows extensive customization for how imports are processed and inserted into your project. This is accomplished via language-specific `vandelay-<lang>.js` files.

## Workspace Configuration Options

### vandelay.configLocation
Absolute path to the folder containing your Vandelay configuration files. If not specified, Vandelay will assume that the first workspace folder in your project contains the configuration files.

### vandelay.projectRoot
TODO: how is this being used exactly?
Absolute path to the folder that Vandelay should consider the root of your project. It will only pay attention to files and folders 


### vandelay.autoImportSingleResult

## Contributing Plugins

### vandelay.registerPlugin
    language: 'js',
    finalizePlugin(plugin) {
      plugin.excludePatterns.push(/.*\/node_modules(\/.*)?/)
    },
    processCachedData,
    buildImportItems,
    insertImport,

### vandelay.commands


# vandelay.js file

**extraImports**
Makes sure they follow the same structure as expected by the corresponding plugin. For example, could be used to achieve "import * as utils from 'src/utils'" by doing:

    extraImports: {
      'src/utils': {
        default: '* as utils'
      }
    }
    
# Organize imports
Although VS Code has this for JavaScript, it works purely via alphabetizing them. If you have your build tools set up to allow you to use absolute imports, this won't allow you to sort them below node modules, or any other kind of custom sorting you may want

# UTILS
- insertImport -> returns a promise (must be awaited?)

# other plugin info
  importPosition that is passed to sharedUtils.insertImport must have the following properties:
  match: (should have a start & end properties)
  indexModifier: 0, 1, -1,
  isFirstImport?: boolean. if true, will add extra line break after import
