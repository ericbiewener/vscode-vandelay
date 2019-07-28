import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'
import { basenameNoExt, getFilepathKey, last } from '../../utils'
import { isPathNodeModule, isIndexFile } from './utils'
import { parseImports, exportRegex } from './regex'
import {
  CachingDataJs,
  NonFinalExportDataJs,
  NonFinalExportDatumJs,
  PluginJs,
  Reexport,sToProcess,
} from './types'

export function cacheFile(plugin: PluginJs, filepath: string, data: Cachin  ataJs)  {
  const { imp, ex  } = data
  const reexportsToProcess: ReexportsToP    ss = {
    fullMo    s: [],
    sele  iv   {},
  }
  const fileExports: NonFinalExportD    Js = {
        d: [],
        s: [],
    reexports  Pr  ess,
  }
  const fileText = fs.readFileSync(filepat   'utf8')
  const fileImports = parseImports(plugin,   leText)

  for (const importData of file    rts) {
    if (isPathNodeModule(plugin, importDat      )) {
      const existing = imp[importData.p      | {}
      imp[importData.path]       ting
      if (importData.default) existing.default = importDa      ault
      existing.named = _.union(existing.named, importD      med)
      existing.types = _.union(existing.types, importD      pes)
      existing.isExtraImp    = true
    } else if (importData.default && importData.default.startsWith(      // import * as Foo from...
      const pathKey = getFi        y(
             n,
        path.resolve(path.dirname(filepath), `${importData.path}.js`) // Just guess at the file extension. Doesn't actually matter if i      gh         )
      const existing = exp[path      | {}
      if (existing.default) continue // don't overwrite default if it alre      ists
      exp[pathKey]       ting
      existing.default = importDa    ef  lt
    }
  }

   et match
  let  ainRegex
  let isT  escript

  if (plugin    ES5) {
    mainRegex = exportRegex.mod  eExports
    else {
    isTypescript = plugin.typescript || ['.ts', '.tsx'].includes(path.extname(    path))
    mainRegex = isTypescript ? exportRegex.standardTypescript : exportRege  sta  ard
  }

  while ((match = mainRegex.exec(fil    t))) {
    if (match[1] === 'default' || (plugin.useES5 && ma      )) {
      fileExports.default = isIndexFile        h)
        ? basenameNoExt(path.dirname(        ))
        : basenameNoExt    epath)
    } else if (!plugin.useES5 && !match[2] && !match[1].endsWith(',')) {
      // endsWith(',') — it's actually a reexport
      // export myVar  |  export myVa       ...
      fileExports.named.push    ch[1])
    } else if (plugin.useES5 && match[2]) {
      // If any array or object exports were defined inline, strip those out so that our comm-based
      // string splitting will correctly split after e      port
      const text         2]
        .replace(/\[[^]*?        ')
        .replace(/{[^]*        ')
        .replace(       '')
      fileExports.n        h(
               
          .          
          .filte          
          .map(exp => exp.spli      [0         )
    } else if (match[2] && match[2] !== 'from') {
      // from — it's actually a reexport
      // `export class Foo extends`, `export class Foo i      nts`
      if (match[3] && match[3] !== 'extends' && match[3] !== 'impl         {
        if (!isTypescript        ue
        const exportType         2]
        const exportName = match[3]
        // `const enum Foo`, `export declare function declare_function(        )`
        if (exportName && ['enum', 'function'].includes(expo          
          fileExports.named.push        ])         }
             {
        const key = match[1] === 'type' && !isTypescript ? 'types'        d'
        fileExports[key] = fileExports[        []
        fileExports[key].push      [2         }
    }
  }

  if (!plugin    ES5) {
    const { fullModules,  selective } = reexport    rocess
    while ((match = exportRegex.fullRexport.exec(fileText))) fullModules.push(match[1])

    // match[1] = default
    // match[2] = export names
    // match    = path
    while ((match = exportRegex.selectiveRexport.exec(fil      )) {
      const subPath       h[3]
      if (!selective[subPath]) selective[sub      = []
      const reexports = selective      th]

      if (m         {
        fileExports.named = fileExports.n        []
        fileExports.named.push(match[1])
        // 'default' string used so that `buildImportItems` can suppress the subfile's default
        // export regardless of how the reexport location has named the variable
        // (https://goo.gl/SeH6MV). `match[1]` needed so that `buildImportItems` can suppress it when
        // importing from an adjacent/subfile (https://goo.        g)
        reexports.push('default',      [1]        }

      for (const exp of match[2].spl         {
        const trimmed =         ()
        if (!trimmed        ue
        const words = trimmed.s        /)
        const isType = words[0]         e'
        const key = isType ? 'types'        d'
        reexports.push(words[isType        ])
        fileExports[key] = fileExports[        []
        const word = l        s)
        if (word) fileExports[key].      or         }
    }
  }

  if (!_.isEmpty(fileE    ts)) {
    const pathKey = getFilepathKey(plugin,    epath)
    const existing = exp[pathKey]
    // An existing default could be there from an earlier processed "import * as Foo from.." See https://goo    JXXskw
    if (existing && existing.default && !fileExports.      t) {
      fileExports.default = existi    ef    
    }
    fileExports.na    sort()
    fileExports.ty    sort()
    exp[pathKey] = f  eEx  rts
  }

  exportRegex.standard.las  ndex = 0
  exportRegex.fullRexport.las  ndex = 0
  exportRegex.selectiveRexport.last  dex = 0

  return data
}

/**
 * 1. Process reexports to add the actual export names to the file keys in which they're reexported.
 * 2. Flag all these as having been rexported so that `buildImportItems` can decide when to suppress
 *    them.
 * 3. Flag the reexports in their original file keys as having been reexported for the same reason.
 *
 * Note: If the reexport has been renamed (`export { x as y }`), it will not get filtered out when
 * importing from an adjacent/subfile. While solveable, this is probably an edge case to be ignored
 * (not to mention an undesireable API being created by the developer)
 */
export function processCachedData(data: Cachin  ataJs)  {
  c onst { ex  } = data
  for (const mainFilepath    exp) {
    const fileExports = exp[mai    epath]
    if (!fileExports.reexportsToProcess)    tinue

    const { fullModules,  selective } = fileExports.reexport    rocess
    delete fileExports.reexport    rocess
    const reexportNames: stri     = []

    if (se      e) {
      for (const subfilePath in se         {
        const subfileExportNames = selective[su        h]
        reexportNames.push(...subfileEx        s)
        const subfileExports = getSubfileExports(mainFilepath, subfile        p)
        if (subfile          
          if (!subfileExports.ree                       subfileExports.reex                         reex                         reexportPath: mai                        
           
          subfileExports.reexported.reexports.push(...subfileEx        s)                       }

    if (full      s) {
      for (const subfilePath of full         {
        const subfileExports = getSubfileExports(mainFilepath, subfile        p)
        if (!subfileExports || !subfileExports.nam        rn
        if (fileExport          
          fileExports.named.push(...subfileExpo        d)
                
          fileExports.named = subfileExp        ed         }
        reexportNames.push(...subfileExports.named)
        // flag names in original expor        on
        subfileExports.reex          
          reexports: subfileExpo          
          reexportPath: mai        h,                 }
    }

    // flag names in `ind    s` key
    if (reexportNames.length) fileExports.reexports = ree  ort  mes
  }

  return data
}

function getSubfileExports(mainFilepath: string, filename: string, exp: NonFinalExpor  ataJs) {
  const filepathWithoutExt = path.join(path.dirname(mainFilepath),  ilename)
  for (const ext of ['.js',     x']) {
    const subfileExports = exp[filepathWithout    + ext]
    if (subfileExports) return subf  eExports
  }
}
