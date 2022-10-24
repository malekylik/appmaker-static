/* jshint esnext: true */

const tableModule = require('Table');
const promosifyServerCall = require('ServerUtils').promosifyServerCall;
const RiskAssessmentStatuses = require('RiskAssessmentConst').RiskAssessmentStatuses;
const executeSendEmail = require('Notification').executeSendEmail;
const getUrlOfView = require('UrlUtils').getUrlOfView;
const getEmailBody = require('Notification').getEmailBody;
const getProcessViewSurveyPage = require('ProcessViewClient').getProcessViewSurveyPage;

const TABLE_NAME = 'GPOReview';

exports.createTable = function (size) {
  return tableModule.createCheckboxsModel(TABLE_NAME, size);
};

exports.getTable = function () {
  return tableModule.getModel(TABLE_NAME);
};

exports.updateRAStatus = function (ids, newValue) {
  return promosifyServerCall('RiskAssessmentServer', 'updateRAStatus')(
    [
    // To send an object to the script
      JSON.stringify(ids),
      newValue,
    ]
  );
};

exports.gpoApproveTimeline = function (widget) {
  var module = exports;
  var model = module.getTable();
  var datasource = app.datasources.GPOProcessRA;

  var items = datasource.items.toArray();
  var selectedItems = tableModule.getSelectedItems(model, items);
  var validItems = selectedItems
    .filter(function (item) { return item.RAID !== null; });
  var ids = validItems
    .map(function (item) { return item.RAID; });
  var itemsToSend = validItems
    .filter(function (item) { return item.GPM; });

  if (ids.length === 0) {
    return;
  }

  widget.enabled = false;

  module.updateRAStatus(ids, RiskAssessmentStatuses.PendingAssignment).then(() => {
    datasource.load();
    app.view.getDescendant('SelectAllRowsCheckBox').value = false;

    tableModule.resetAllCheckboxs(model);

    widget.enabled = true;

    exports.notifyGPMAboutPreRASurveyReady(itemsToSend);
  });
};

exports.requestRATimelineChange = function (widget) {
  var module = exports;
  var model = module.getTable();

  var tableBody = widget.root.getDescendant('RAProcessTimeFrameTableBody');
  var items = tableBody.getDescendantsByClass('app-reasonForChangeTextField');

  var selectedItems = tableModule.getSelectedItems(model, items);

  var allFieldsValid = selectedItems.reduce((prev, w) => w.validate() && prev, true);

  if (selectedItems.length === 0 || !allFieldsValid) {
    return;
  }

  var datasource = app.datasources.GPOProcessRA;

  // TODO: move to sepearate func
  items = datasource.items.toArray();
  selectedItems = tableModule.getSelectedItems(model, items);
  var validItems = selectedItems
    .filter(function (item) { return item.RAID !== null; });
  var ids = validItems
    .map(function (item) { return item.RAID; });
  var itemsToSend = validItems
    .filter(function (item) { return item.GPM; });

  if (ids.length === 0) {
    return;
  }

  widget.enabled = false;

  module.updateRAStatus(ids, RiskAssessmentStatuses.PendingScopingChange).then(() => {
    datasource.load();
    app.view.getDescendant('SelectAllRowsCheckBox').value = false;

    tableModule.resetAllCheckboxs(model);

    widget.enabled = true;

    app.closeDialog();

    exports.notifyGPMAboutRAScopeChangingReady(itemsToSend);
  });
};

const gpmPreSurveyNotificationHeader = 'Your process ready for pre survey';

/**
* @param {Object} items - options for transforming text
* @param {string} [options.GPM]
* @param {string} [options.ProcessName]
*/
exports.notifyGPMAboutPreRASurveyReady = function (items) {
  const res = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const params = getProcessViewSurveyPage(item.ProcessID);
    const notificationBody = `Hi ${item.GPM}, Your process (${item.ProcessName}) is in scope for Risk Assessment, kindly fill the pre risk assessment survey - ${getUrlOfView(app.views.ProcessView, params)}`;

    res.push(executeSendEmail([item.GPM], gpmPreSurveyNotificationHeader, getEmailBody(notificationBody)));
  }

  return Promise.all(res);
};

const gpmRAScopeChangingNotificationHeader = 'Request for change in Risk Assessment scoping';

/**
* @param {Object} items - options for transforming text
* @param {string} [options.GPM]
* @param {string} [options.ProcessName]
*/
exports.notifyGPMAboutRAScopeChangingReady = function (items) {
  const res = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const notificationBody = `Hi ${item.GPM}, GPO has requested for change in Risk Assessment scoping for ${item.ProcessName}, please review.`;

    res.push(executeSendEmail([item.GPM], gpmRAScopeChangingNotificationHeader, getEmailBody(notificationBody)));
  }

  return Promise.all(res);
};

