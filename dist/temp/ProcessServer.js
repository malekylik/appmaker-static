var dataService = require('dataService');
var getMaxRiskImpact = require('RiskUtils').getMaxRiskImpact;
var getInherentRiskRating = require('RiskUtils').getInherentRiskRating;
var getResidualRiskRating = require('RiskUtils').getResidualRiskRating;
var impactToNumber = require('RiskUtils').impactToNumber;
var OccurrenceOptions = require('UIConst').OccurrenceOptions;

function calculateInheritedRiskRating(process, risks) {
  var maxImpact = 0;

  for (var i = 0; i < risks.length; i++) {
    var currentImpact = getMaxRiskImpact(risks[i]);
    
    maxImpact = impactToNumber(currentImpact) > impactToNumber(maxImpact) ? currentImpact : maxImpact;
  }
  
  var maxLikelihood = Math.max.apply(null, risks.map(function (risk) { return OccurrenceOptions.indexOf(risk.RiskDriverLikelihood); })) || 0;
  
  return getInherentRiskRating(OccurrenceOptions[maxLikelihood], maxImpact);
}

function calculateResidualRiskRating(inheritedRiskRating, controlEffectiveness) {
  return getResidualRiskRating(inheritedRiskRating, controlEffectiveness);
}

function createProcessInfoRecords(query) {
  var records = [];

  var processes = dataService.queryRecords({
    model: 'Process',
    filters: {
      ProcessID: { in: [query.parameters.ProcessID] },
    },
  }).getRecords();
  
  if (processes.length === 0) return [];
  
  for (var i = 0; i < processes.length; i++) {
    var process = processes[i];
    var record = dataService.createRecord('ProcessInfo');
    
    record.ProcessID = process.ProcessID;
    record.Complexity = process.Complexity;
    record.DocumentLastUpdated = process.DocumentLastUpdated;
    record.DocumentUrl = process.DocumentUrl;
    record.Frequency = process.Frequency;
    record.GPM = process.GPM;
    record.GPO = process.GPO;
    record.HCProcessId = process.HCProcessId;
    record.O2CMapping = process.O2CMapping;
    record.PDDOwner = process.PDDOwner;
    record.ProcessControlEffectiveness = process.ProcessControlEffectiveness;
    record.ProcessCreationDate = process.ProcessCreationDate;
    record.ProcessDescription = process.ProcessDescription;
    record.ProcessInherentRiskRating = process.ProcessInherentRiskRating;
    record.ProcessName = process.ProcessName;
    record.ProcessResidualRiskRating = process.ProcessResidualRiskRating;
    record.ProcessRollUp = process.ProcessRollUp;
    record.RCOSubTower = process.RCOSubTower;
    record.RCOTower = process.RCOTower;
    record.OperationsLead = process.OperationsLead;
    record.OutstandingGaps = 0;
    
    records.push(record);
  }
  
  var risks = dataService.queryRecords({
    model: 'RiskDriver',
    filters: {
      ProcessID: { in: processes.map(function (process) { return process.ProcessID; }) },
    },
  }).getRecords();
  
  if (risks.length === 0) return records;

  for (i = 0; i < records.length; i++) {
    var record = records[i]; // jshint ignore:line
    var inherentRiskRating = calculateInheritedRiskRating(record, risks.filter(function (risk) { return risk.ProcessID === record.ProcessID; })); // jshint ignore:line
    record.ProcessInherentRiskRating = inherentRiskRating;
    record.ProcessResidualRiskRating = calculateResidualRiskRating(inherentRiskRating, record.ProcessControlEffectiveness);
  }
  
  var constrols = dataService.queryRecords({
    model: 'Controls',
    filters: {
      RiskID: { in: risks.map(function (risk) { return risk.RiskID; }) },
    },
  }).getRecords();
  
  if (constrols.length === 0) return records;
  
  var gaps = dataService.queryRecords({
    model: 'Gaps',
    filters: {
      ControlId: { in: constrols.map(function (control) { return control.ControlID; }) },
    },
  }).getRecords();
  
  for (i = 0; i < records.length; i++) {
    records[i].OutstandingGaps = gaps.length;
  }

  return records;
}

exports.createProcessInfoRecords = createProcessInfoRecords;