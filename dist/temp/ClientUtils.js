/* jshint esnext: true */

/**
 * @param {(loadConfig: { success: () => void; failure: () => void; }) => void} func
 * @returns {() => Promise<void>}
 */
exports.promosifyClientCall = (func) => (() => new Promise((res, rej) => func({
  success: res,
  failure: rej,
})));