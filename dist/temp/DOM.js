/* jshint esnext: true */

function isElementOfParent(parent, element) {
  let isParent = parent === element;

  while (!(isParent = parent === element) && (element = element.parentElement));

  return isParent;
}

exports.isElementOfParent = isElementOfParent;
