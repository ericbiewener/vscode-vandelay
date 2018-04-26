# Vandelay
VS Code extension for automating imports. Currently supports JavaScript & Python.

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

    
