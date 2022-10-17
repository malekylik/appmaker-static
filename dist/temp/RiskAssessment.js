/* jshint esnext: true */

const promosifyServerCall = require('ServerUtils').promosifyServerCall;
const executeSendEmail = require('Notification').executeSendEmail;
const getEmailBody = require('Notification').getEmailBody;
const getUrlOfView = require('UrlUtils').getUrlOfView;
const tableModule = require('Table');

const TABLE_NAME = 'RiskAssessment';

exports.createTable = function (size) {
  return tableModule.createCheckboxsModel(TABLE_NAME, size);
};

exports.getTable = function () {
  return tableModule.getModel(TABLE_NAME);
};

exports.updateRALeadForRiskAssessments = function (ids, newValue) {
  return promosifyServerCall('RiskAssessmentServer', 'updateRALeadForRiskAssessments')(
    [
    // To send an object to the script
      JSON.stringify(ids),
      newValue,
    ]
  );
};

exports.markNotInScope = function (ids) {
  return promosifyServerCall('RiskAssessmentServer', 'markNotInScope')(
    [
    // To send an object to the script
      JSON.stringify(ids),
    ]
  );
};

const gpoNotificationHeader = 'New RAs to review';
const gpoNotificationBody = `Hi,

You have processes in scope for risk assessment in the coming quarter, please review them in Spotlight and provide your approval.

${getUrlOfView(app.views.ProcessesScope)}`;


/**
* @param {Array<string>} mails - list of email
*/
exports.notifyGPOAboutRA = function (mails) {
  return executeSendEmail(mails, gpoNotificationHeader, getEmailBody(gpoNotificationBody));
};

exports.updateRALeadHandler = function (widget, newValue) {
  var module = exports;
  var model = module.getTable();

  var items = app.datasources.FilteredProcessWithRA.items.toArray();
  var selectedItems = tableModule.getSelectedItems(model, items);
  var validItems = selectedItems
    .filter(function (item) { return item.RAID !== null; });
  var ids = validItems
    .map(function (item) { return item.RAID; });
  var gpos = validItems
    .filter(function (item) { return item.GPO !== null; })
    .map(function (item) { return item.GPO; });

  if (ids.length === 0) {
    return;
  }

  widget.enabled = false;

  module.updateRALeadForRiskAssessments(ids, newValue).then(() => {
    app.datasources.FilteredProcessWithRA.load();
    app.view.getDescendant('SelectAllRowsCheckBox').value = false;

    tableModule.resetAllCheckboxs(model);

    widget.enabled = true;
    widget.value = null;

    if (gpos.length !== 0) {
      return module.notifyGPOAboutRA(gpos);
    }
  });
};

exports.notInScopeHandler = function (widget) {
  var module = exports;
  var model = module.getTable();

  var items = app.datasources.FilteredProcessWithRA.items.toArray();
  var selectedItems = tableModule.getSelectedItems(model, items);
  var ids = selectedItems
    .map(function (item) { return item.RAID; })
    .filter(function (item) { return item !== null; });

  if (ids.length === 0) {
    return;
  }

  widget.enabled = false;

  module.markNotInScope(ids)
    .then(() => {
      app.datasources.FilteredProcessWithRA.load();
      app.view.getDescendant('SelectAllRowsCheckBox').value = false;

      tableModule.resetAllCheckboxs(model);

      widget.enabled = true;

      app.closeDialog();
    });
};
