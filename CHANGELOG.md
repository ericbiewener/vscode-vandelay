### Version 3.0.0
- New `Initialize Project` command to get started with Vandelay more easily.

### Version 2.4.0
- Normalize import paths for Windows (write / to file rather than \)

### Version 2.3.0
- Support *.mdx file extensions

### Version 2.2.0
- Preserve relative Python import paths
- Fix bug in `Fix Imports` command that could cause active file's unused imports to not get removed

### Version 2.1.0
- Typescript support

### Version 2.0
- Made JavaScript & Python plugins part of core Vandelay extension, so no longer any need to install
  those plugins separately. If you previously installed Vandelay JS or Vandelay PY, you may
  uninstall them.

### Version 1.3.1
- Fix for windows
- Downgrade event-stream because of security vulnerability

### 1.3.0
- Add Fix Imports command

### 1.2.3
- Dispose the disposables

### 1.2.2
- Suppress alert

### 1.2.1
- More flexible diagnostic filtering API

### 1.2.0
- Focus back to original editor after removing unused imports

### 1.1.0
- New feature: "Import Undefined Variables" command
- New feature: "Remove Unused Imports" command
- Add extension update notification
- Support *.mjs file extension
