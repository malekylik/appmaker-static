var ScoreOptions = require('UIConst').ScoreOptions;
var ImpactOptions = require('UIConst').ImpactOptions;

var InherentRiskMap = {
};

InherentRiskMap[ScoreOptions.Remote] = {};
InherentRiskMap[ScoreOptions.Low] = {};
InherentRiskMap[ScoreOptions.Medium] = {};
InherentRiskMap[ScoreOptions.High] = {};

InherentRiskMap[ScoreOptions.Remote][ScoreOptions.DeMinimis] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.Remote][ScoreOptions.Low] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.Remote][ScoreOptions.Medium] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.Remote][ScoreOptions.High] = ScoreOptions.Medium;

InherentRiskMap[ScoreOptions.Low][ScoreOptions.DeMinimis] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.Low][ScoreOptions.Low] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.Low][ScoreOptions.Medium] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.Low][ScoreOptions.High] = ScoreOptions.Medium;

InherentRiskMap[ScoreOptions.Medium][ScoreOptions.DeMinimis] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.Medium][ScoreOptions.Low] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.Medium][ScoreOptions.Medium] = ScoreOptions.Medium;
InherentRiskMap[ScoreOptions.Medium][ScoreOptions.High] = ScoreOptions.High;

InherentRiskMap[ScoreOptions.High][ScoreOptions.DeMinimis] = ScoreOptions.Low;
InherentRiskMap[ScoreOptions.High][ScoreOptions.Low] = ScoreOptions.Medium;
InherentRiskMap[ScoreOptions.High][ScoreOptions.Medium] = ScoreOptions.High;
InherentRiskMap[ScoreOptions.High][ScoreOptions.High] = ScoreOptions.High;

var ResidualRiskMap = {
};

ResidualRiskMap[ScoreOptions.Low] = {};
ResidualRiskMap[ScoreOptions.Medium] = {};
ResidualRiskMap[ScoreOptions.High] = {};

ResidualRiskMap[ScoreOptions.Low][ScoreOptions.Low] = ScoreOptions.Low;
ResidualRiskMap[ScoreOptions.Low][ScoreOptions.Medium] = ScoreOptions.Low;
ResidualRiskMap[ScoreOptions.Low][ScoreOptions.High] = ScoreOptions.Low;

ResidualRiskMap[ScoreOptions.Medium][ScoreOptions.Low] = ScoreOptions.Medium;
ResidualRiskMap[ScoreOptions.Medium][ScoreOptions.Medium] = ScoreOptions.Medium;
ResidualRiskMap[ScoreOptions.Medium][ScoreOptions.High] = ScoreOptions.Low;

ResidualRiskMap[ScoreOptions.High][ScoreOptions.Low] = ScoreOptions.High;
ResidualRiskMap[ScoreOptions.High][ScoreOptions.Medium] = ScoreOptions.Medium;
ResidualRiskMap[ScoreOptions.High][ScoreOptions.High] = ScoreOptions.Low;

function impactToNumber(impact) {
  return ImpactOptions.indexOf(impact);
}

function getMaxRiskImpact(risk) {
  var maxImpact = Math.max.apply(null, [
    impactToNumber(risk.FinancialImpact), impactToNumber(risk.LegalComplianceImpact),
    impactToNumber(risk.OperationalImpact), impactToNumber(risk.ReputationalImpact),
  ]) || 0;
  
  return ImpactOptions[maxImpact];
}

function getInherentRiskRating(maxLikelihood, maxImpact) {
  return InherentRiskMap[maxLikelihood || ScoreOptions.Remote][maxImpact || ScoreOptions.DeMinimis];
}

function getResidualRiskRating(inherentRisk, controlEffectiveness) {
  return ResidualRiskMap[inherentRisk || ScoreOptions.Low][controlEffectiveness || ScoreOptions.Low];
}

exports.getMaxRiskImpact = getMaxRiskImpact;
exports.getInherentRiskRating = getInherentRiskRating;
exports.getResidualRiskRating = getResidualRiskRating;
exports.impactToNumber = impactToNumber;
