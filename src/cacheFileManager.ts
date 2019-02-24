import fs from "fs";
import { isFile } from "./utils";
import { ExportData, Plugin } from "./types";

let fileAccess: Promise<void>;

function parseCacheFile(plugin: Plugin) {
  return isFile(plugin.cacheFilePath)
    ? JSON.parse(fs.readFileSync(plugin.cacheFilePath, "utf-8"))
    : {};
}

/**
 * Block access to the cache file until a previous accessor has finished its operations.
 * This prevents race conditions resulting in the last accessor overwriting prior ones' data.
 *
 * `cb` should return a promise (e.g. any file writing operations) so that it completes before the next call
 * to the cacheFileManager
 */
export function cacheFileManager(
  plugin: Plugin,
  cb: (data: ExportData) => void
) {
  if (fileAccess) {
    fileAccess = fileAccess.then(() => cb(parseCacheFile(plugin)));
  } else {
    fileAccess = Promise.resolve(cb(parseCacheFile(plugin)));
  }
  return fileAccess;
}
