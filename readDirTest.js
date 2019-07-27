const path = require('path')
const fs = require('fs-extra')

function isFile(file) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    if (e.code !== 'ENOENT') throw e // File might exist, but something else went wrong (e.g. permissions error)
    return false
  }
}

const rootDir = '/Users/ericbiewener/Repos/vscode-vandelay'

function sync(dir, packageJsons = []) {
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    if (isFile(fullPath)) {
      if (item === 'package.json') {
        packageJsons.push(fullPath)
      }
    } else {
      sync(fullPath, packageJsons)
    }
  }
  return packageJsons
}

async function async(dir, packageJsons = []) {
  return fs
    .readdir(dir)
    .then(items => {
      const promises = []
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const p = fs.stat(fullPath).then(stats => {
          if (stats.isFile()) {
            if (item === 'package.json') {
              packageJsons.push(fullPath)
            }
          } else  {
            return async(fullPath, packageJsons, promises)
          }
        })

        promises.push(p)
      }
      return Promise.all(promises)
    })
    .then(() => packageJsons)
}

function goSync() {
  console.time('sync')
  const found = sync(rootDir)
  console.timeEnd('sync')
  console.log(found.length)
}

async function goAsync() {
  console.time('async')
  const found = await async(rootDir)
  console.timeEnd('async')
  console.log(found.length)
}

// goSync()
goAsync()
