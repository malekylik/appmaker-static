var dataService = require('dataService');
var getMaxRiskImpact = require('RiskUtils').getMaxRiskImpact;
var getInherentRiskRating = require('RiskUtils').getInherentRiskRating;
var getResidualRiskRating = require('RiskUtils').getResidualRiskRating;
var impactToNumber = require('RiskUtils').impactToNumber;
var numberToImpact = require('RiskUtils').numberToImpact;
var OccurrenceOptions = require('UIConst').OccurrenceOptions;
var ScoreOptions = require('UIConst').ScoreOptions;

/**
 * @param {Array<RiskDriver>} risks
 * @returns {ScoreOptions}
 */
function calculateInheritedRiskRating(risks) {
  var maxImpact = 0;

  for (var i = 0; i < risks.length; i++) {
    var currentImpact = getMaxRiskImpact(risks[i]);

    maxImpact = impactToNumber(currentImpact) > maxImpact ? impactToNumber(currentImpact) : maxImpact;
  }

  var maxLikelihood = Math.max.apply(null, risks.map(function (risk) { return OccurrenceOptions.indexOf(risk.RiskDriverLikelihood); })) || 0;

  return getInherentRiskRating(OccurrenceOptions[maxLikelihood], numberToImpact(maxImpact));
}

/**
* @param {ScoreOptions | undefined} inheritedRiskRating
* @param {ScoreOptions | undefined} controlEffectiveness
* @returns {ScoreOptions}
*/
function calculateResidualRiskRating(inheritedRiskRating, controlEffectiveness) {
  return getResidualRiskRating(inheritedRiskRating, controlEffectiveness);
}

/**
 * @param {Array<{ ProcessID: number; ProcessInherentRiskRating: string; ProcessResidualRiskRating: string; }>} processes
 * @returns {{ risks: Array<RiskDriver>; controls: Array<Controls>; }}
 */
function fillResidualRiskRatingForProcesses(processes) {
  /** @type {Array<RiskDriver>} */
  var risks = dataService.queryRecords({
    model: 'RiskDriver',
    filters: {
      ProcessID: { in: processes.map(function (process) { return process.ProcessID; }) },
    },
  }).getRecords();

  if (risks.length === 0) return { risks: risks, controls: [] };

  for (var i = 0; i < processes.length; i++) { // jshint ignore:line
    var record = processes[i]; // jshint ignore:line
    var inherentRiskRating = calculateInheritedRiskRating(risks.filter(function (risk) { return risk.ProcessID === record.ProcessID; })); // jshint ignore:line
    record.ProcessInherentRiskRating = inherentRiskRating;
  }

  /** @type {Array<Controls>} */
  var controls = dataService.queryRecords({
    model: 'Controls',
    filters: {
      RiskID: { in: risks.map(function (risk) { return risk.RiskID; }) },
    },
  }).getRecords();

  for (var i = 0; i < processes.length; i++) { // jshint ignore:line
    var record = processes[i]; // jshint ignore:line

    var inherentRiskRating = record.ProcessInherentRiskRating; // jshint ignore:line
    var processRisks = risks.filter(function (risk) { return risk.ProcessID === record.ProcessID; }); // jshint ignore:line
    var processControls = controls.filter(function (control) { return processRisks.filter(function (risk) { return risk.RiskID === control.RiskID; }).length > 0; }); // jshint ignore:line

    // Part of control effectivness
    var maxDesignAdequancy = numberToImpact(Math.max.apply(null, processControls.map(function (control) { return control.DesignAdequacyRating ? impactToNumber(control.DesignAdequacyRating) : impactToNumber(ScoreOptions.Low); })) || impactToNumber(ScoreOptions.Low)); // jshint ignore:line
    var processControlEffectiveness = maxDesignAdequancy;

    record.ProcessResidualRiskRating = calculateResidualRiskRating(inherentRiskRating, processControlEffectiveness);
  }

  return { risks: risks, controls: controls };
}

function createProcessInfoRecords(query) {
  var records = [];

  /** @type {Array<Process>} */
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
    record.ProcessRollUp = process.ProcessRollUp;
    record.RCOSubTower = process.RCOSubTower;
    record.RCOTower = process.RCOTower;
    record.OperationsLead = process.OperationsLead;
    record.OutstandingGaps = 0;

    records.push(record);
  }

  var controls = fillResidualRiskRatingForProcesses(records).controls;

  if (controls.length === 0) return records;

  /** @type {Array<Gaps>} */
  var gaps = dataService.queryRecords({
    model: 'Gaps',
    filters: {
      ControlId: { in: controls.map(function (control) { return control.ControlID; }) },
    },
  }).getRecords();

  for (var i = 0; i < records.length; i++) { // jshint ignore:line
    records[i].OutstandingGaps = gaps.length;
  }

  return records;
}

exports.createProcessInfoRecords = createProcessInfoRecords;
exports.fillResidualRiskRatingForProcesses = fillResidualRiskRatingForProcesses;