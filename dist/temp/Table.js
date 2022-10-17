/* jshint esnext: true */

const CHECKBOXS_SIZE = 30;

let model = new Map();

/**
* @param {string} modelName
* @param {number} loadedSize
*/
exports.createCheckboxsModel = function (modelName, loadedSize) {
  model.set(modelName, {
    lastPortionSize: loadedSize - (((loadedSize / CHECKBOXS_SIZE) | 0) * CHECKBOXS_SIZE),
    checked: new Array(Math.ceil(loadedSize / CHECKBOXS_SIZE)).fill(0),
  });

  return model.get(modelName);
};

/**
* @param {string} modelName
*/
exports.getModel = function (modelName) {
  return model.get(modelName);
};

exports.toggleCheckbox = function (model, itemIndex) {
  var checked = model.checked;

  var i = (itemIndex / CHECKBOXS_SIZE) | 0;
  var j = itemIndex - i;

  checked[i] = (checked[i] & ~(1 << j)) | ((~(checked[i] & (1 << j))) & (1 << j));

  return exports.getCheckboxValue(model, itemIndex);
};

exports.getCheckboxValue = function (model, itemIndex) {
  var checked = model.checked;

  var i = (itemIndex / CHECKBOXS_SIZE) | 0;
  var j = itemIndex - i;

  return ((checked[i] >>> j) & 1) === 1;
};

exports.isAllCheckboxsSelected = function (model) {
  var lastPortionSize = model.lastPortionSize;
  var isSelected = true;

  for (var i = 0; i < model.checked.length - 1; i++) {
    isSelected = isSelected && ((model.checked[i] & ((1 << CHECKBOXS_SIZE) - 1)) === ((1 << CHECKBOXS_SIZE) - 1));
  }

  return isSelected && ((model.checked[i] & ((1 << lastPortionSize) - 1)) === ((1 << lastPortionSize) - 1));
};

exports.selectAllCheckboxs = function (model) {
  var checked = model.checked;

  for (var i = 0; i < checked.length; i++) {
    checked[i] = (1 << CHECKBOXS_SIZE) - 1;
  }
};

exports.resetAllCheckboxs = function (model) {
  var checked = model.checked;

  for (var i = 0; i < checked.length; i++) {
    checked[i] = 0;
  }
};

exports.getSelectedItems = function (model, items) {
  return items.filter(function (_, i) { return exports.getCheckboxValue(model, i); });
};

// ---

var SORT_OPTIONS = {
  ASC:  'ASC',
  DESC: 'DESC',
};

function getNextSortOption(currentSortOption) {
  if (currentSortOption === null) {
    return SORT_OPTIONS.ASC;
  }

  return currentSortOption === SORT_OPTIONS.ASC ? SORT_OPTIONS.DESC : SORT_OPTIONS.ASC;
}

function getSortOptionIndicator(currentSortOption) {
  //                                                 ▲          ▼
  return currentSortOption === SORT_OPTIONS.ASC ? '\u25B2' : '\u25BC';
}

function getHeaderForSortOption(currentSortOption, headerText) {
  return headerText + ' ' + getSortOptionIndicator(currentSortOption);
}

exports.getNextSortOption = getNextSortOption;
exports.getSortOptionIndicator = getSortOptionIndicator;
exports.getHeaderForSortOption = getHeaderForSortOption;
