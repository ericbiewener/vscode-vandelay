const _ = require('lodash')
const chalk = require('chalk')
const { detailedDiff } = require('deep-object-diff')

function stringify(args) {
  return args.map(a => a && Object.getPrototypeOf(a) === Object.prototype ? JSON.stringify(a, null, 2): a)
}

function log(...args) {
  console.log(...stringify(args))
}

Object.assign(log, {
  error: (...args) => console.error(chalk.red(...stringify(args))),
  success: (...args) => console.log(chalk.green(...stringify(args))),
  info: (...args) => console.info(chalk.blue(...stringify(args))),
})

function parseObj(snapshotData) {
  return JSON.parse(
    snapshotData
      .replace(/Object /g, '')
      .replace(/Array /g, '')
      .replace(/(?:,)(\n *[}\]])/g, '$1') // remove trailing commas
    )
} 

function transformBak(bak) {
  const extraImports = bak._extraImports
  delete bak._extraImports
  return {
    exp: bak,
    imp: extraImports,
  }
}

function highlightDiffChange(diff, ...keys) {
  for (const k in diff) {
    const v = diff[k]
    const keyArray = [...keys, k]
    if (Array.isArray(v)) {
      if (v.length) log.error(keyArray.join('.'), v)
    } else if (v) {
      if (typeof v === "object") {
        highlightDiffChange(v, ...keyArray)
      } else {
        log.error(keyArray.join('.'), v)
      }
    }
  }
}

function compareAll(newPath) {
  log.info('------------------------------------------------------------------')
  log.info(`comparing: ${newPath}`)
  log.info('------------------------------------------------------------------')
  const newSnap = require(newPath)
  const oldSnap = require(`${newPath}.BAK`)
  
  const newKeys = Object.keys(newSnap)
  const oldKeys = Object.keys(oldSnap)
  
  if (!_.isEqual(newKeys, oldKeys)) {
    log.error('keys do not match')
    log.error('new', newKeys)
    log.error('old', newKeys)
    return
  }

  for (const key in newSnap) {
    const newObj = parseObj(newSnap[key])
    const oldObj = transformBak(parseObj(oldSnap[key]))
    log.success(`snapshot: ${key}`)
    const diff = detailedDiff(oldObj, newObj)
    log(diff)
    highlightDiffChange(diff)
  }
}



compareAll('./tests/js/single-root/__snapshots__/cache.test.js.snap')
compareAll('./tests/js/es5/__snapshots__/cache.test.js.snap')

