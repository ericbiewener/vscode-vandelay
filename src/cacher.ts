import { window, workspace, Uri } from "vscode";
import path from "path";
import fs from "fs-extra";
import _ from "lodash";
import anymatch from "anymatch";
import { writeCacheFile, getLangFromFilePath, getFilepathKey } from "./utils";
import { cacheFileManager } from "./cacheFileManager";
import { PLUGINS } from "./plugins";
import { Obj, Plugin, CachingData } from "./types";

function shouldIgnore(plugin: Plugin, filePath: string) {
  return anymatch(plugin.excludePatterns, filePath);
}

async function cacheDir(
  plugin: Plugin,
  dir: string,
  recursive: boolean,
  data: CachingData
): Promise<CachingData> {
  const items = await fs.readdir(dir);
  const readDirPromises: Promise<any>[] = [];

  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (item === plugin.configFile || shouldIgnore(plugin, fullPath)) continue;

    readDirPromises.push(
      fs.lstat(fullPath).then(async stats => {
        if (stats.isFile()) {
          if (plugin.language === getLangFromFilePath(item))
            await plugin.cacheFile(plugin, fullPath, data);
        } else if (recursive) {
          await cacheDir(plugin, fullPath, true, data);
        }

        return Promise.resolve();
      })
    );
  }

  await Promise.all(readDirPromises);
  return data;
}

export async function cacheProjectLanguage(plugin: Plugin) {
  if (!plugin.includePaths || !plugin.includePaths.length) {
    window.showErrorMessage(
      `You must specify the "includePaths" configuration option in your vandelay-${
        plugin.language
      }.js file.`
    );
    return false;
  }

  let cacher = Promise.all(
    plugin.includePaths.map(p =>
      cacheDir(plugin, p, true, { imp: {}, exp: {} })
    )
  ).then(cachedDirTrees => {
    const finalData = { exp: {}, imp: {} };
    for (const { exp, imp } of cachedDirTrees) {
      Object.assign(finalData.exp, exp);
      // Merge extra import arrays
      _.mergeWith(finalData.imp, imp, (obj, src) => {
        if (!Array.isArray(obj)) return;
        return _.uniq(obj.concat(src));
      });
    }
    return finalData;
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

  const { exp, imp } = plugin.cacheFile(plugin, doc.fsPath, {} as CachingData);
  if (_.isEmpty(exp) && _.isEmpty(imp)) return;

  for (const k in exp) exp[k].cached = Date.now();

  cacheFileManager(plugin, cachedData => {
    // Concatenate & dedupe named/types arrays. Merge them into extraImports since that will in turn get
    // merged back into cachedData
    _.mergeWith(cachedData.exp, exp, (a, b) => {
      if (_.isArray(a)) return _.union(b, a);
    });
    Object.assign(cachedData.imp, imp);

    return writeCacheFile(plugin, cachedData);
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
      const { exp } = cachedData;
      if (!exp[key]) return;
      delete exp[key];
      return writeCacheFile(plugin, cachedData);
    });
  });

  return watcher;
}
