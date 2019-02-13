import { window, workspace, Uri } from "vscode";
import path from "path";
import fs from "fs-extra";
import _ from "lodash";
import anymatch from "anymatch";
import {
  writeCacheFile,
  getLangFromFilePath,
  getFilepathKey
 } from "./utils";
import { cacheFileManager } from "./cacheFileManager";
import { PLUGINS } from "./plugins";
import { Obj, Plugin } from "./types"

function shouldIgnore(plugin: Plugin, filePath: string) {
  return anymatch(plugin.excludePatterns, filePath);
}

// TODO: need generics for data
// async function cacheDir<D extends Obj>(plugin: Plugin, dir: string, recursive: boolean, data: D) {
async function cacheDir(plugin: Plugin, dir: string, recursive: boolean, data: any) {
  return fs.readdir(dir)
    .then(items => {
      const readDirPromises = [];

      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (item === plugin.configFile || shouldIgnore(plugin, fullPath))
          continue;

        readDirPromises.push(
          fs.lstat(fullPath).then(stats => {
            if (stats.isFile()) {
              if (plugin.language === getLangFromFilePath(item))
                plugin.cacheFile(plugin, fullPath, data);
            } else if (recursive) {
              return cacheDir(plugin, fullPath, true, data);
            }
          })
        );
      }

      return Promise.all(readDirPromises);
    })
    .then(() => data);
}

export function cacheProjectLanguage(plugin: Plugin) {
  if (!plugin.includePaths || !plugin.includePaths.length) {
    window.showErrorMessage(
      `You must specify the "includePaths" configuration option in your vandelay-${
        plugin.language
      }.js file.`
    );
    return false;
  }
  let cacher = Promise.all(
    plugin.includePaths.map(p => cacheDir(plugin, p, true, {}))
  ).then(exportObjArrays => {
    const finalData = {};
    const extraImports = {};
    for (const data of exportObjArrays) {
      Object.assign(finalData, data);
      // Merge extra import arrays
      _.mergeWith(extraImports, data._extraImports, (obj, src) => {
        if (!Array.isArray(obj)) return;
        return _.uniq(obj.concat(src));
      });
    }
    return Object.assign(finalData, { _extraImports: extraImports });
  });

  if (plugin.processCachedData) cacher = cacher.then(plugin.processCachedData);
  return cacher.then(data => writeCacheFile(plugin, data));
}

export function cacheProject() {
  if (_.isEmpty(PLUGINS)) {
    window.showErrorMessage(
      "No Vandelay configuration files found. If you just added one, reload the window."
    );
    return;
  }
  return Promise.all(_.map(PLUGINS, cacheProjectLanguage)).then(results => {
    if (results.includes(false)) return; // Weren't able to cache all languages. Don't display success message.
    // Don't return this because that will return a promise that doesn't resolve until the message gets dismissed.
    window.showInformationMessage("Project exports have been cached. 🐔");
  });
}

function onChangeOrCreate(doc: Uri) {
  const plugin: Plugin | undefined = PLUGINS[getLangFromFilePath(doc.fsPath)];
  if (
    !plugin ||
    shouldIgnore(plugin, doc.fsPath) ||
    // TODO: Since we are watching all files in the workspace, not just those in plugin.includePaths,
    // we need to make sure that it is actually in that array. Can this be changed so that we only
    // watch files in plugin.includePaths to begin with? Not sure if this can be accomplished with
    // a single glob. If not, we'd need multiple watchers. Would either case be more efficient than
    // what we're currently doing?
    !plugin.includePaths.some(p => doc.fsPath.startsWith(p))
  )
    return;

  const data = {}
  const extraImports = {}
  plugin.cacheFile(plugin, doc.fsPath, data, extraImports);
  if (_.isEmpty(data)) return;

  for (const k in data) data[k].cached = Date.now();

  cacheFileManager(plugin, cachedData => {
    // Concatenate & dedupe named/types arrays. Merge them into extraImports since that will in turn get
    // merged back into cachedData
    _.mergeWith(extraImports, cachedData._extraImports, (a, b) => {
      if (_.isArray(a)) return _.union(a, b);
    });
    return writeCacheFile(plugin, Object.assign(cachedData, data));
  });
}

export function watchForChanges() {
  const watcher = workspace.createFileSystemWatcher("**/*.*");

  watcher.onDidChange(onChangeOrCreate);
  watcher.onDidCreate(onChangeOrCreate);

  watcher.onDidDelete(doc => {
    const plugin = PLUGINS[getLangFromFilePath(doc.fsPath)];
    if (!plugin) return;

    cacheFileManager(plugin, cachedData => {
      const key = getFilepathKey(plugin, doc.fsPath);
      if (!cachedData[key]) return;
      delete cachedData[key];
      return writeCacheFile(plugin, cachedData);
    });
  });

  return watcher;
}
