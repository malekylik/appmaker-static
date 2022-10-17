/* jshint esnext: true */

exports.uniq = (arr, by) => {
  const exist = {};
  const filtered = [];

  for (let i = 0; i < arr.length; i++) {
    const value = by(arr[i]);

    if (exist[value] !== 1) {
      exist[value] = 1;
      filtered.push(arr[i]);
    }
  }

  return filtered;
};
