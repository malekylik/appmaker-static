var dataService = require('dataService');
var ModelStatus = require('DatabaseUtils').ModelStatus;

function getSurveyData(processID) {
  var dataService = require('dataService');

  var riskAssessments = dataService.queryRecords({
    model: 'RiskAssessment',
    filters: {
      ProcessID: { eq: processID },
    },
  }).getRecords();


  if (riskAssessments.length === 0) {
    return { ras: [], surveys: [] };
  }

  var raids = riskAssessments.map(function (ra) { return ra.RAID; });

  var preSurveyResults = dataService.queryRecords({
    model: 'PreRASurveyResults',
    filters: {
      RAID: { in: raids },
    },
  }).getRecords();

  return { ras: riskAssessments, surveys: preSurveyResults };
}

function saveSurveyResult(processID, complexityScore) {
  if (!processID) {
    return JSON.stringify([]);
  }

  var res = getSurveyData(processID);
  var raids = res.ras.map(function (_ra) { return _ra.RAID; });
  var preSurveyResults = res.surveys;

  if (raids.length === 0) {
    return JSON.stringify([complexityScore]);
  }

  var records = [];

  // TODO: probably we need to store only for latest Risk Assessment
  for (var i = 0; i < raids.length; i++) {
    var raid = raids[i];
    var survey = preSurveyResults.filter(function (_survey) { return _survey.RAID === raid; })[0]; // jshint ignore:line

    if (!survey) {
      survey = dataService.createDraftRecord('PreRASurveyResults');
    }

    survey.RAID = raids[i];
    survey.ComplexityScore = Number(complexityScore);
    survey.status = ModelStatus.Done;

    records.push(survey);
  }

  dataService.saveRecords(records);

  return JSON.stringify(records.map(function (record) { return record.id; }).concat([complexityScore]));
}

exports.saveSurveyResult = saveSurveyResult;
exports.getSurveyData = getSurveyData;
