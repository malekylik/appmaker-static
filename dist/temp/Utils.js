/* jshint esnext: true */

/**
 * @template T
 * @param {Array<T>} arr
 * @param {(item: T) => string} by
 * @returns {Array<T>}
 */
exports.uniq = (arr, by) => {
  /** @type {Record<string, number>} */
  const exist = {};
  /** @type {Array<T>} */
  const filtered = [];

  for (let i = 0; i < arr.length; i++) {
    const value = by(/** @type {T} */ (arr[i]));

    if (exist[value] !== 1) {
      exist[value] = 1;
      filtered.push(/** @type {T} */ (arr[i]));
    }
  }

  return filtered;
};
