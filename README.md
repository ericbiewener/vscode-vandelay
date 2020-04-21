<p align="center"><img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay/master/logo.png" width="128" height="112" align="center" /></p>
<h1 align="center">Vandelay</h1>

<p align="center">
  <strong>VS Code extension for automating imports.</strong>
  <br />
  Currently supports JavaScript and Python.
</p>

<br />
<p align="center">
<img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay/master/artwork/animation.gif" width="757" height="426" align="center" />
</p>
<br />

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Typescript & Flow Support](#typescript--flow-support)
- [Commands](#commands)
- [Importing external and environment packages](#importing-external-and-environment-packages)
- [How to Use](#how-to-use)
- [Configuration](#configuration)
- [JavaScript Only Options](#javascript-only-options)
- [Multi-Root Workspace](#multi-root-workspace)
- [Example Configuration File for a JavaScript Project](#example-configuration-file-for-a-javascript-project)
- [Example Configuration File for a Python Project](#example-configuration-file-for-a-python-project)
- [Settings](#settings)

## Overview

<a href="https://www.youtube.com/watch?v=W4AN8Eb2LL0&t=2m10s" target="_blank"><img src="https://raw.githubusercontent.com/ericbiewener/vscode-vandelay/master/artwork/video.jpg" alt="He's an importer exporter" width="240" align="right" /></a>
Importing code is annoying and the current VS Code tooling around it isn't good enough.
This plugin keeps track of all available imports and allows you to quickly import them following
whatever style guide your project requires for how import statements get written (see
[Configuration](#configuration)). Multi-root workspaces are supported ([documentation](#multi-root-workspace)).

## Quick Start

1. Run the `Initialize Project` command.
2. Profit! Vandelay will suggest imports as you type, or use the `Import` command to start importing all the things.

The above will be enough for most projects to get off the ground. More complex use-cases may need to further customize the configuration file. See [How to Use](#how-to-use).

## Typescript & Flow Support

Both Typescript and Flow are supported.

## Commands

The following commands are available from the Command Palette. Feel free to set your own keyboard shortcuts.

### Initialize Project

Run this command to get started with Vandelay. It will create an initial Vandelay configuration file which you can then [further customize](#configuration).

### Cache Project Exports

Caches all project exports in all languages that have a Vandelay configuration file (see
[How to Use](#how-to-use)). Vandelay will automatically run this command the first time it
initializes for a given project, and the plugin will watch for file changes (including git branch
switching, file deletion, etc) in order to update its cache of available imports. But you may need
to manually run this command if files are changed while VS Code is not running.

### Import

Generates an import statement for the selected import from your project.

### Import active word

A shortcut to automatically import the word under the cursor. If more than one import matching the active word are found, you'll be asked to choose.

### Import undefined variables

Vandelay will attempt to find imports for all undefined variables reported by the linter for the
active file. Like the "Import active word" command, if only a single possible import is found for a
given variable, it will automatically be imported. Otherwise, you will need to choose the correct
one. JavaScript requires the [ESLint](https://github.com/Microsoft/vscode-eslint) extension to be
installed for this to work, while Python currently supports
[flake8](https://code.visualstudio.com/docs/python/linting#_flake8). If you want undefined Flow types imported, the
[Flow](https://github.com/flowtype/flow-for-vscode) extension must be installed.

### Remove Unused Imports

Vandelay will remove all unused imports reported by the linter. This command requires the linters mentioned above in _Import undefined variables_.

### Fix Imports

Combination of the previous two commands. Imports all undefined variables and removes unused imports.

### Fix All Import Paths

Typescript only. For any files that have Typescript diagnostics reported about bad import paths `TS2307: Cannot find module '...'`, Vandelay will attempt to fix the import paths.

## Importing external and environment packages

**JavaScript**<br>
Vandelay does its best to parse your `package.json` file (or files, if you're using Yarn workspaces) and gather the available imports from the listed dependencies. Depending on how an NPM package is organized, this sometimes isn't possible. In these cases, however, Vandelay will track your use of package imports and automatically make those available as well. In other words, after manually writing an import statement for a node module, Vandelay will then pick up on that and make it available for automatic imports in the future.

**Python**<br> Vandelay tracks the packages you use. This means you'll need to write the import statement yourself the very first time you use something from an external package, but the plugin will remember after that and make it available for automatic importing.

## How to Use

Vandelay relies on JavaScript configuration files, not simply JSON, so that the plugin can be fully customized to your project's needs. This means the setup is a bit more complex, but the resulting capability is far more powerful.

## Configuration

You must create a file at the root of your project named `vandelay-js.js` to automate JavaScript imports, or `vandelay-py.js` to automate Python imports. If using a multi-root
workspace, see [those instructions](#multi-root-workspace). We recommend using the [`Initialize Project`](#initialize-project) command to create an initial version of this file.

Along with providing configuration options, the presence of this file tells the plugin that it
should track your project's imports. The lack of a `vandelay-<js|py>.js` file in a given
project will simply cause the plugin not to run.

The configuration file must be written in JavaScript and export an object (`module.exports = { ... }` syntax) containing the desired configuration options. This file may be as simple as something like:

```js
const path = require('path')
module.exports = {
  includePaths: [path.join(__dirname, 'src')],
}
```

The above config will often be sufficient for simple projects, while tools like [Prettier](https://prettier.io/) make a lot of the below JavaScript options unneccessary. See [this sample configuration file](#example-configuration-file) for a more complex example.

### `includePaths: Array<string>`

An array of filepaths that Vandelay should watch for exports. This is the only required configuration option.

### `excludePatterns: Array<string | RegExp>`

An array of glob patterns and regular expressions that match filepaths which should be excluded from caching.
Vandelay automatically excludes `node_modules` for JavaScript projects.

### `importGroups: Array<string> (JS) | Array<Array<string>> (PY)`

**JavaScript**<br>
Vandelay will automatically sort import statements so that node modules come before your project's
custom imports, and it will alphabetize them by path. This configuration option allows you to select
specific imports that should always be sorted first.

**Python**<br>
Vandelay will automatically sort import statements so package imports come before your project's
custom imports, and it will alphabetize them by path. This configuration option allows you establish
some custom ordering, grouping certain imports together with full line breaks if desired. Ungrouped
packages will sort before grouped ones, while ungrouped non-package imports will sort after their
grouped equivalents. For example:

```js
importGroups: [
  ['django', 'rest_framework'],
  ['src9', 'src1'],
]
```

The above configuration will result in something like:

```py
import os # ungrouped package import sorts before grouped

from django.shortcuts import get_object_or_404
from rest_framework.response import Response

import src9
import src1

import src3 # ungrouped non-package import sorts after grouped
```

### `maxImportLineLength: number`

Defaults to 100. Used to determine when to wrap import statements onto multiple lines.

### `processImportPath(importPath: string, absImportPath: string, activeFilepath: string, projectRoot: string): ?string`

When inserting a new import, this setting allows you to modify the import path that gets written to
the file. Useful if you have your build tool configured in a way that allows it to process
non-relative paths (for example, all your imports are written relative to the project root). Returning a
falsey value will cause the standard relative path to be used.

- `importPath`:
  _ **JavaScript:** Relative import path that will be written if you don't return a value
  _ **Python:** Dot-style import path that Vandelay is going to write (e.g. django.shortcuts)
- `absImportPath`: Absolute path of the import file
- `activeFilepath`: Absolute path to the active file open in your editor
- `projectRoot`: Absolute path to the root of your project

**JavaScript Example**

```js
processImportPath: (importPath, absImportPath, activeFilepath, projectRoot) =>
  absImportPath.startsWith('/Users/eric/my-project/absoluteImportDirectory')
    ? absImportPath.slice(projectRoot.length + 1)
    : null
```

**Python Example**

```js
processImportPath: (importPath) =>
  importPath.startsWith('my_packages.foo') ? importPath.slice('my_packages.'.length) : importPath
```

### `processImportName(importName: string, importPath: string, absImportPath: string, activeFilepath: string, projectRoot: string, isDefault: boolean): ?string`

When selecting an import, this setting allows you to modify the names of the imports that will appear in the list and ultimately get written to the file.
Returning a falsey value will cause the original import name to be used.

- `importName`: Name of the import.
- `importPath`:
  _ **JavaScript:** Relative import path
  _ **Python:** Dot-style import path (e.g. django.shortcuts)
- `absImportPath`: Absolute path of the import file
- `activeFilepath`: Absolute path to the active file open in your editor
- `projectRoot`: Absolute path to the root of your project
- `importPath`:
  _ **JavaScript:** Whether the
  _ **Python:** N/A. This argument simply isn't available.

**JavaScript Example**

```js
processImportName: (
  importName,
  importPath,
  absImportPath,
  activeFilepath,
  projectRoot,
  isDefault
) => (absImportPath === 'react' ? '* as React' : null)
```

**Python Example**

```js
processImportName: (importName) => (importName === 'json' ? 'json as original_json' : null)
```

### `shouldIncludeImport(absImportPath: string, activeFilepath: string): boolean`

May be used to exclude certain imports from the list of options.

- `absImportPath`: Absolute path of the import file
- `activeFilepath`: Absolute path to the active file open in your editor

```js
shouldIncludeImport: (absImportPath, activeFilepath) =>
  absImportPath.includes('__mocks__') && !activeFilepath.endsWith('.test.js')
```

## JavaScript Only Options

### `padCurlyBraces: boolean` (JS only)

Defaults to `true`. Whether import statements should include spaces between curly braces and import
names.

### `useSingleQuotes: boolean` (JS only)

Defaults to `true`. Whether import statements should be writting with single or double quotes.

### `useSemicolons: boolean` (JS only)

Defaults to `true`. Whether import statements should be writting with semicolons.

### `cssExtensions: string[]` (JS only)

Defaults to `['css', 'pcss']`. Vandelay will offer a CSS Module import option if an adjacent file to the active one exists with the same name and one of the defined CSS extensions. For example, if the same directory contains `MyComponent.ts` and `MyComponent.css`, then Vandelay will let you automatically import the CSS Module styles into `MyComponent.ts`, i.e. `import styles from './MyComponent.css'`

### `multilineImportStyle: 'multiple' | 'single'` (JS only)

Defaults to `multiple`. Whether to allow multiple imports on a line when the import needs to span
multiple lines because it has gone over the [allowed line length](#maximportlinelength-number).

**multiple**

```js
import { var1, var2, var3 } from '...'
```

**single**

```js
import { var1, var2, var3 } from '...'
```

### `trailingComma: boolean` (JS only)

Defaults to `true`. Whether multiline statements should include trailing commas. Only relevant when
`multilineImportStyle` is `single`.

### `nonModulePaths: Array<string>` (JS Only)

if you have configured your build tool to allow imports relative to the project root for certain
paths (thus causing them not to begin with `./` or `../`), specify the roots of these paths here.
These should not be absolute paths, e.g. use `src1` not `Users/eric/my-project/src1`.

_This is done only to prevent them from being considered node_module imports when caching or
determining import order_. You must use `processImportPath` to have the desired path actually get
written to the file instead of the relative path.

### `preferTypeOutside: boolean` (JS Only)

Defaults to `false`. If using Flow, settings this to `true` will cause import statements for types
to put the type on the outside of the braces (`import type { Type1, Type2 } ...`) _so long as only
types are being imported from the given import path_. This can help mitigate circular dependency
issues under some circumstances. Regardless of this setting, if a value import exists for a given
path then the syntax `import { myVal, type Type1 } ...` will be used.

### `useES5: boolean` (JS only)

Defaults to `false`. If your project uses ES5 module syntax (i.e. `require`) you should set this to
true. Only `module.exports = { foo, bar }` and `module.exports = defaultExport` syntax is supported.

### `typescript: boolean` (JS only)

Files ending in `*.ts` will automatically be parsed as Typescript files. You only need to set this
configuration option to `true` if your Typescript files end in `*.js`.

## Multi-Root Workspace

You must add a `.vandelay` directory to your workspace that contains a file named `vandelay-<js|py>.js`.
Along with the above configuration options, you must also provide a `projectRoot` string that
specifies the absolute path to the directory that should be considered the overall root of your
project. This will be used for determining relative paths (these paths may always be adjusted via
the `processImportPath` configuration option described above.

## Example Configuration File for a JavaScript Project

```js
const path = require('path')

const src1 = path.join(__dirname, 'src1')
const src2 = path.join(__dirname, 'src2')
const src3 = path.join(__dirname, 'src3')

module.exports = {
  includePaths: [src1, src2, src3],
  excludePatterns: [
    // No need to include `node_modules`. Vandelay will exclude that automatically.
    '**/*.test.*',
    /.*\/flow-typed\/.*/,
    /.*\/config\/.*/,
  ],
  /**
   * Webpack configured to use allow imports relative to the project root for anything in `src1`.
   *    - `nonModulePaths` config tells Vandelay that imports beginning with these paths should not be
   *      considered node_modules.
   *    - `processImportPath` config tells Vandelay to write paths for `src1` relative to the project root.
   */
  nonModulePaths: ['src1'],
  processImportPath: (importPath, absImportPath, activeFilepath, projectRoot) => {
    if (absImportPath.startsWith(src1)) return absImportPath.slice(projectRoot.length + 1)
  },
  shouldIncludeImport: (absImportPath, activeFilepath) => {
    return (
      !(activeFilepath.startsWith(src2) && absImportPath.startsWith(src3)) && // src2 can't import from src3
      !(activeFilepath.startsWith(src3) && absImportPath.startsWith(src1)) && // src3 can't import from src2
      // src1 can only import from src1
      !(
        activeFilepath.startsWith(src1) &&
        (absImportPath.startsWith(src2) || absImportPath.startsWith(src3))
      )
    )
  },
}
```

## Example Configuration File for a Python Project

```js
const path = require('path')

const src1 = path.join(__dirname, 'src1')
const src2 = path.join(__dirname, 'src2')

module.exports = {
  includePaths: [src1, src2, src3],
  excludePatterns: [
    '**/*.test.*',
    '**/migrations/**/*.*',
    '**/management/commands/**/*.*',
    /.*\/config\/.*/,
  ],
  importGroups: [
    ['django', 'rest_framework'],
    ['src9', 'src1'],
  ],
  maxImportLineLength: 120,
  processImportPath: (importPath) =>
    importPath.startsWith('my_packages.foo') ? importPath.slice('my_packages.'.length) : importPath,
  shouldIncludeImport: (absImportPath, activeFilepath) =>
    absImportPath.includes('__fixtures__') && !activeFilepath.endsWith('.test.py'),
}
```

## Settings

The following settings are available through the VS Code settings interface:

### `autoImportSingleResult: boolean`

Defaults to `true`. When the `Import active word` command is used, the import will be automatically
written to the file if only a single result is found.

### `provideCompletions: boolean`

Defaults to `true`. Provide autocomplete suggestions as you type.
