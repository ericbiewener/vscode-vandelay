jest.mock('vscode', () => {
  const path = require('path')
  const _ = require('lodash')
  const root = path.resolve()
  
  return {
    window: {
      showInformationMessage: _.noop,
    },
    workspace: {
      workspaceFolders: [
        {
          uri: {
            path: path.join(root, 'test-project')
          }
        }
      ]
    },
  }
}, {virtual: true})
