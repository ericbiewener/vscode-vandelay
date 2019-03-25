const _ = require('lodash')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const log = require('log-all-the-things')
const { detailedDiff } = require('deep-object-diff')
const jestDiff = require('jest-diff')

function parseObj(snapshotData) {
  return JSON.parse(
    snapshotData
      .replace(/Object /g, '')
      .replace(/Array /g, '')
      .replace(/: undefined,/g, ': " undefined",')
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
  const newSnaps = require(newPath)
  const oldSnaps = require(`${newPath}.BAK`)
  
  const newKeys = Object.keys(newSnaps)
  const oldKeys = Object.keys(oldSnaps)
  
  // Make sure comparisons have same snapshots
  if (!_.isEqual(newKeys, oldKeys)) {
    log.error('keys do not match')
    log.error('new', newKeys)
    log.error('old', newKeys)
    return
  }

  for (const key in newSnaps) {
    log.success(`snapshot: ${key}`)

    const newSnap = newSnaps[key]
    const oldSnap = oldSnaps[key]
    let newObj
    let oldObj

    try {
      newObj = parseObj(newSnap)
      oldObj = parseObj(oldSnap)
    } catch(e) {
      // Must be import insert tests
      if (newSnap === oldSnap) {
        log('output is equal!')
      } else {
        log.error('output is different')
        log(jestDiff(oldSnap, newSnap))
      }
      continue
    }

    if (Array.isArray(newObj)) { // buildImports tests
      newObj = newObj.map(o => JSON.stringify(o)).sort()
      oldObj = oldObj.map(o => JSON.stringify(o)).sort()
    } else { // cached data tests
      oldObj = transformBak(oldObj)
    }

    const diff = detailedDiff(oldObj, newObj)
    log(diff)
    highlightDiffChange(diff)
  }
}

function findSnapshots(snapshots, dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.lstatSync(fullPath).isFile()) {
      if (fullPath.endsWith('.snap')) snapshots.push(fullPath)
    } else {
      findSnapshots(snapshots, fullPath);
    }
  }
}

const snapshots = []
findSnapshots(snapshots, path.join(process.cwd(), './tests'))
snapshots.forEach(compareAll)
