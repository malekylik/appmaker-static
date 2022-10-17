var dataService = require('dataService');
var ModelStatus = require('DatabaseUtils').ModelStatus;

function getProcessRiskAssessments(processID) {
  var riskAssessments = dataService.queryRecords({
    model: 'RiskAssessment',
    filters: {
      ProcessID: { eq: processID },
    },
  }).getRecords();

  return riskAssessments;
}

function getQuestionnaireAnswersForRAs(riskAssessments, questionIDs) {
  if (riskAssessments.length === 0) {
    return [];
  }

  var raids = riskAssessments.map(function (ra) { return ra.RAID; });

  var questionnaireResults = dataService.queryRecords({
    model: 'RAQuestionnaireAnswers',
    filters: {
      RAID: { in: raids },
      QuestionNumber: { in: questionIDs }
    },
  }).getRecords();

  return questionnaireResults;
}

function getQuestionnaireResultsForRAs(riskAssessments) {
  if (riskAssessments.length === 0) {
    return [];
  }

  var raids = riskAssessments.map(function (ra) { return ra.RAID; });

  var questionnaireResults = dataService.queryRecords({
    model: 'RAQuestionnaireResults',
    filters: {
      RAID: { in: raids },
    },
  }).getRecords();

  return questionnaireResults;
}

function getQuestionnaireAnswersByProcessID(processID, questionIDs) {
  var riskAssessments = getProcessRiskAssessments(processID);

  return { riskAssessments: riskAssessments, answers: getQuestionnaireAnswersForRAs(riskAssessments, questionIDs) };
}

// TODO: to get the questions for one RA, should be the latest RA
function getQuestionnaireDataFiltered(processID) {
  var res = getQuestionnaireAnswersByProcessID(processID, []);

  if (res.riskAssessments.length === 0) {
    return res.answers;
  }

  var raid = res.riskAssessments[0].RAID;
  var answers = res.answers;
  var records = [];

  for (var i = 0; i < answers.length; i++) {
    if (answers[i].RAID === raid) {
      records.push(answers[i]);
    }
  }

  return records;
}

function getQuestionnaireResultsByProcessID(processID) {
  var riskAssessments = getProcessRiskAssessments(processID);

  return { riskAssessments: riskAssessments, results: getQuestionnaireResultsForRAs(riskAssessments) };
}

function forEachAnswer(raids, questions, answers, callback) {
  var records = [];

  // TODO: probably we need to store only for latest Risk Assessment
  for (var j = 0; j < raids.length; j++) {
    for (var i = 0; i < questions.length; i++) {
      var raid = raids[j];
      var question = questions[i];
      var answerRecord = answers.filter(function (answer) { return answer.RAID === raid && answer.QuestionNumber === question.question; })[0]; // jshint ignore:line

      if (!answerRecord) {
        answerRecord = dataService.createDraftRecord('RAQuestionnaireAnswers');
      }

      callback(answerRecord, question, raid);

      records.push(answerRecord);
    }
  }

  return records;
}

function forEachResult(raids, results, callback) {
  var records = [];

  // TODO: probably we need to store only for latest Risk Assessment
  for (var i = 0; i < raids.length; i++) {
    var raid = raids[i];
    var resultRecord = results.filter(function (result) { return result.RAID === raid; })[0]; // jshint ignore:line

    if (!resultRecord) {
      resultRecord = dataService.createDraftRecord('RAQuestionnaireResults');
    }

    callback(resultRecord, raid);

    records.push(resultRecord);
  }

  return records;
}

/**
* @param {string} processID
* @param {Object} data
* @param {string} [data.question]
* @param {string} [data.rating]
* @param {string} [data.comment]
*/
function saveQuestionnaireAnswers(processID, data) {
  if (!processID) {
    return JSON.stringify([]);
  }

  var questions = JSON.parse(data);
  var riskAssessments = getProcessRiskAssessments(processID);
  var raids = riskAssessments.map(function (_ra) { return _ra.RAID; });

  if (raids.length === 0) {
    return JSON.stringify([]);
  }

  var quesyionNumbers = questions.map(function (question) { return question.question; });
  var answers = getQuestionnaireAnswersForRAs(riskAssessments, quesyionNumbers);
  var results = getQuestionnaireResultsForRAs(riskAssessments);
  var records = forEachAnswer(raids, questions, answers, function (answer, question, raid) {
    answer.RAID = raid;
    answer.QuestionNumber = question.question;

    answer.Rating = question.rating;
    answer.Comments = question.comment;
  });

  records = records.concat(
    forEachResult(raids, results, function (resultRecord, raid) {
      resultRecord.RAID = raid;
      resultRecord.status = ModelStatus.InProgress;
    })
  );

  dataService.saveRecords(records);

  return JSON.stringify([]);
}

/**
* @param {string} processID
* @param {Object} data
* @param {string} [data.question]
* @param {string} [data.rating]
* @param {string} [data.comment]
*/
function completeQuestionnaire(processID, data) {
  if (!processID) {
    return JSON.stringify([]);
  }

  var questions = JSON.parse(data);
  var riskAssessments = getProcessRiskAssessments(processID);
  var raids = riskAssessments.map(function (_ra) { return _ra.RAID; });

  if (raids.length === 0) {
    return JSON.stringify([]);
  }

  var quesyionNumbers = questions.map(function (question) { return question.question; });
  var answers = getQuestionnaireAnswersForRAs(riskAssessments, quesyionNumbers);
  var results = getQuestionnaireResultsForRAs(riskAssessments);
  var records = forEachAnswer(raids, questions, answers, function (answer, question, raid) {
    answer.RAID = raid;
    answer.QuestionNumber = question.question;

    answer.Rating = question.rating;
    answer.Comments = question.comment;
  });

  records = records.concat(
    forEachResult(raids, results, function (resultRecord, raid) {
      resultRecord.RAID = raid;
      resultRecord.status = ModelStatus.Done;
    })
  );

  dataService.saveRecords(records);

  return JSON.stringify([]);
}

exports.getQuestionnaireDataFiltered = getQuestionnaireDataFiltered;
exports.getQuestionnaireResultsByProcessID = getQuestionnaireResultsByProcessID;
exports.saveQuestionnaireAnswers = saveQuestionnaireAnswers;
exports.completeQuestionnaire = completeQuestionnaire;
