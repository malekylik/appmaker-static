var dataService = require('dataService');
var dateUtils = require('DateUtils');
var RiskAssessmentStatuses = require('RiskAssessmentConst').RiskAssessmentStatuses;
var logger = require('logger');

var getNextQuarters = dateUtils.getNextQuarters;

exports.getRiskAssessmentByProcessID = function (id) {
  var processes = dataService.queryRecords({
    model: 'Process',
    filters: {
      ProcessID: { in: [id] }
    }
  }).getRecords();
  
  if (processes.length === 0) {
    return [];
  }
  
  var riskAssessments = dataService.queryRecords({
    model: 'RiskAssessment',
    filters: {
      ProcessID: { in: processes.map(function (process) { return process.ProcessID; }) }
    }
  }).getRecords();
  
  return riskAssessments;
};

function forEachRistAsssessment(ids, func) {
  var records = dataService.queryRecords({
    model: 'RiskAssessment',
    filters: {
      RAID: { in: ids }
    }
  }).getRecords();

  records.forEach(func);

  return records;
}

exports.updateRALeadForRiskAssessments = function(ids_json, newValue) {
  var ids = JSON.parse(ids_json);

  var records = forEachRistAsssessment(ids, function (record) { record.RALead = newValue; });

  dataService.saveRecords(records);

  return JSON.stringify(records.map(function (record) { return record.RAID; }));
};


exports.markNotInScope = function(ids_json) {
  var ids = JSON.parse(ids_json);

  var currentDate = new Date();

  var records = forEachRistAsssessment(ids, function (record) {
    var nextRADate = record.NextRADate && record.NextRADate > currentDate ? record.NextRADate : currentDate;
    var nextRAQuarter = getNextQuarters(nextRADate, 1)[0];

    record.NextRADate = nextRAQuarter;
  });

  dataService.saveRecords(records);

  return JSON.stringify(records.map(function (record) { return record.RAID; }));
};

exports.updateRAStatus = function(ids_json, newValue) {
  var ids = JSON.parse(ids_json);

  var records = forEachRistAsssessment(ids, function (record) { record.RAStatus = newValue; });

  dataService.saveRecords(records);

  return JSON.stringify(records.map(function (record) { return record.RAID; }));
};

exports.onCompleteSurvey = function(ids_json, newValue) {
  var ids = JSON.parse(ids_json);

  var records = dataService.queryRecords({
    model: 'RiskAssessment',
    filters: {
      ProcessID: { in: ids }
    }
  }).getRecords();

  records.forEach(function (record) { record.RAStatus = newValue; });

  dataService.saveRecords(records);

  return JSON.stringify(records.map(function (record) { return record.RAID; }));
};

exports.approveRiskAssessment = function (ids_json) {
  var ids = JSON.parse(ids_json);

  var currentDate = new Date();
  var nextYearDate = new Date((currentDate.getMonth() + 1) + '/' + currentDate.getDate() + '/' + (currentDate.getFullYear() + 1));

  logger.debug('current date');
  logger.debug(currentDate);

  var records = forEachRistAsssessment(ids, function (record) {
    record.RAStatus = RiskAssessmentStatuses.Approved;

    record.LastRADate = record.NextRADate;
    record.NextRADate = nextYearDate;
  });

  dataService.saveRecords(records);

  return JSON.stringify(records.map(function (record) { return record.RAID; }));
};
