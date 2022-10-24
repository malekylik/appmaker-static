/**
 * @readonly
 * @enum {string}
 */
var ScoreOptions = {
  DeMinimis: 'De-Minimis',
  Remote: 'Remote',

  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
};

/**
 * @type {Array<ScoreOptions>}
 */
var ImpactOptions = [
  ScoreOptions.DeMinimis,
  ScoreOptions.Low,
  ScoreOptions.Medium,
  ScoreOptions.High,
];

/**
 * @type {Array<ScoreOptions>}
 */
var OccurrenceOptions = [
  ScoreOptions.Remote,
  ScoreOptions.Low,
  ScoreOptions.Medium,
  ScoreOptions.High,
];

/**
 * @type {Array<ScoreOptions>}
 */
var SurveyQuestionnaireOptions = [ScoreOptions.Low, ScoreOptions.High];

/**
 * @type {Array<ScoreOptions>}
 */
var QuestionnaireOptions = [ScoreOptions.Low, ScoreOptions.Medium, ScoreOptions.High];

exports.ScoreOptions = ScoreOptions;

exports.SurveyQuestionnaireOptions = SurveyQuestionnaireOptions;
exports.QuestionnaireOptions = QuestionnaireOptions;
exports.ImpactOptions = ImpactOptions;
exports.OccurrenceOptions = OccurrenceOptions;
