var ScoreOptions = {
  DeMinimis: 'De-Minimis',
  Remote: 'Remote',
  
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
};

var ImpactOptions = [
  ScoreOptions.DeMinimis,
  ScoreOptions.Low,
  ScoreOptions.Medium,
  ScoreOptions.High,
];

var OccurrenceOptions = [
  ScoreOptions.Remote,
  ScoreOptions.Low,
  ScoreOptions.Medium,
  ScoreOptions.High,
];

var SurveyQuestionnaireOptions = [ScoreOptions.Low, ScoreOptions.High];

var QuestionnaireOptions = [ScoreOptions.Low, ScoreOptions.Medium, ScoreOptions.High];

exports.ScoreOptions = ScoreOptions;

exports.SurveyQuestionnaireOptions = SurveyQuestionnaireOptions;
exports.QuestionnaireOptions = QuestionnaireOptions;
exports.ImpactOptions = ImpactOptions;
exports.OccurrenceOptions = OccurrenceOptions;
