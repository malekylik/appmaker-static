/* jshint esnext: true */

exports.promosifyClientCall = (func) => (() => new Promise((res, rej) => func({
  success: res,
  failure: rej,
})));