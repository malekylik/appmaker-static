var dataService = require('dataService');

var fillResidualRiskRatingForProcesses = require('ProcessServer').fillResidualRiskRatingForProcesses;

// TODO: probably on big datasets can cause a performance issue
function getFilteredProcessWithRA(query, filters, havingFitler) {
  var records = [];

  // For some reason just map over sortBy throw an error
  var sortByRaw = JSON.parse(JSON.stringify(query.sortBy));
  var sortBy = sortByRaw
    .filter(function (order) {
      return !( // jshint ignore:line
        order[0] === 'ProcessResidualRiskRating'
      );
    })
    .map(function (order) {
      var isProcessModelField = (
        order[0] === 'RCOTower' ||
      order[0] === 'RCOSubTower' ||
      order[0] === 'DocumentUrl' ||
      order[0] === 'HCProcessId' ||
      order[0] === 'ProcessName' ||
      order[0] === 'GPO' ||
      order[0] === 'GPM'
      );

      if (isProcessModelField) {
        return ['Process.' + order[0], order[1]];
      }


      return order;
    });

  // Right join
  var riskAssessments = dataService.queryRecords({
    model: 'RiskAssessment',
    filters: filters,
    sortBy: sortBy,
    prefetch: ['Process']
  }).getRecords();

  for (var i = 0; i < riskAssessments.length; i++) {
    var riskAssessment = riskAssessments[i];
    var process = riskAssessment.Process;
    var record = dataService.createRecord('ProcessRA');

    record.ProcessID = process.ProcessID;
    record.HCProcessId = process.HCProcessId;
    record.ProcessName = process.ProcessName;
    record.GPO = process.GPO;
    record.GPM = process.GPM;
    record.RCOTower = process.RCOTower;
    record.RCOSubTower = process.RCOSubTower;
    record.ProcessControlEffectiveness = process.ProcessControlEffectiveness;
    record.ProcessCreationDate = process.ProcessCreationDate;
    record.DocumentUrl = process.DocumentUrl;

    record.RAID = riskAssessment.RAID;
    record.RALead = riskAssessment.RALead;
    record.LastRADate = riskAssessment.LastRADate;
    record.NextRADate = riskAssessment.NextRADate;
    record.RAFrequency = riskAssessment.RAFrequency;
    record.RAStatus = riskAssessment.RAStatus;

    records.push(record);
  }

  fillResidualRiskRatingForProcesses(records);

  if (havingFitler) {
    records = records.filter(havingFitler);
  }

  for (var i = 0; i < records.length; i++) { // jshint ignore:line
    records[i].RecordsCount = records.length;
  }

  var sortByResidualRiskRating = sortByRaw.find(function (order) { return order[0] === 'ProcessResidualRiskRating'; });
  if (sortByResidualRiskRating) {
    var asc = function (a, b) { return a.ProcessResidualRiskRating < b.ProcessResidualRiskRating; };
    var desc = function (a, b) { return a.ProcessResidualRiskRating > b.ProcessResidualRiskRating; };

    records.sort(sortByResidualRiskRating[1] ? asc : desc);
  }

  if (query.limit === 0) return records;


  return records.slice(query.offset, query.offset + query.limit);
}

function getFilteredProcessWithRAForRiskAssessment(query) {
  var filters = {
    'ProcessID.notIn': [null],

    'Process.HCProcessId': { eq: query.parameters.hcProcessId },
    'Process.RCOTower': { eq: query.parameters.rcoTower },
    'Process.RCOSubTower': { eq: query.parameters.rcoSubTower },
    'Process.GPM': { eq: query.parameters.gpm },
    'Process.GPO': { eq: query.parameters.gpo },

    'LastRADate.eq': query.parameters.lastRADate,
    'NextRADate.eq': query.parameters.nextRADate,
    'RALead.eq': query.parameters.raLead,
  };

  var havingFitler;

  if (query.parameters.processResidualRiskRating !== null) {
    havingFitler = function (record) { return record.ProcessResidualRiskRating === query.parameters.processResidualRiskRating; };
  }

  return getFilteredProcessWithRA(query, filters, havingFitler);
}

function getFilteredProcessWithRAForRiskAssessmentHistory(query) {
  var filters = {
    'ProcessID.in': [query.parameters.ProcessID === null ? -1 : query.parameters.ProcessID],
    'RAStatus.in': query.parameters.statuses,
  };

  return getFilteredProcessWithRA(query, filters);
}

exports.getFilteredProcessWithRAForRiskAssessment = getFilteredProcessWithRAForRiskAssessment;
exports.getFilteredProcessWithRAForRiskAssessmentHistory = getFilteredProcessWithRAForRiskAssessmentHistory;
