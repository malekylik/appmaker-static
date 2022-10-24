/* jshint esnext: true */

const logger = require('logger');

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

function isSortOptionInit(option) {
  return option.size > 1;
}

function initSortOption(option) {
  if (isSortOptionInit(option)) {
    logger.warning('[initSortOption] sort option is already inited');

    return;
  }

  option.add(null);
  option.add(null);
}

function getFieldNameFromSortOption(option) {
  return option.size > 0 && option.get(0);
}

function getPrecedenceFromSortOption(option) {
  return option.size > 1 && option.get(1);
}

function setFieldNameFromSortOption(option, value) {
  if (option.size > 0) {
    option.set(0, value);
  } else {
    logger.warning('[setFieldNameFromSortOption] cant set sort name. Probably sort option wasnt init properly');
  }
}

function setPrecedenceFromSortOption(option, value) {
  if (option.size > 1) {
    option.set(1, value);
  } else {
    logger.warning('[setFieldNameFromSortOption] cant set sort precedence. Probably sort option wasnt init properly');
  }
}

function sortOptionToAppMakerSortOption(option) {
  if (isSortOptionInit(option)) {
    return [getFieldNameFromSortOption(option), getPrecedenceFromSortOption(option) === SORT_OPTIONS.ASC];
  } else {
    logger.warning('[sortOptionToAppMakerSortOption] unable convert sort option. Probably sort option wasnt init properly');

    return [];
  }
}

function getAppMakerSortOption(name, precedence) {
  return [name, precedence === SORT_OPTIONS.ASC];
}

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

function getTableHeader(currentSort, field) {
  return (
    getFieldNameFromSortOption(currentSort) === field.name ?
      getHeaderForSortOption(getPrecedenceFromSortOption(currentSort), field.displayName) :
      field.displayName
  );
}

function sortTableByField(datasource, currentSort, name, precedence) {
  datasource.query.sortBy([getAppMakerSortOption(name, precedence)]);

  datasource.load(function () {
    setPrecedenceFromSortOption(currentSort, precedence);
    setFieldNameFromSortOption(currentSort, name);
  });
}

function onSortByHeaderHandler(datasource, currentSort, field) {
  const precedence = getFieldNameFromSortOption(currentSort) === field.name ? getNextSortOption(getPrecedenceFromSortOption(currentSort)) : getNextSortOption(null);
  const name = field.name;

  sortTableByField(datasource, currentSort, name, precedence);
}

exports.SORT_OPTIONS = SORT_OPTIONS;
exports.getNextSortOption = getNextSortOption;
exports.getSortOptionIndicator = getSortOptionIndicator;
exports.getHeaderForSortOption = getHeaderForSortOption;
exports.getTableHeader = getTableHeader;
exports.getAppMakerSortOption = getAppMakerSortOption;
exports.isSortOptionInit = isSortOptionInit;
exports.onSortByHeaderHandler = onSortByHeaderHandler;
exports.sortOptionToAppMakerSortOption = sortOptionToAppMakerSortOption;
exports.initSortOption = initSortOption;
exports.sortTableByField = sortTableByField;
exports.setFieldNameFromSortOption = setFieldNameFromSortOption;
exports.setPrecedenceFromSortOption = setPrecedenceFromSortOption;
