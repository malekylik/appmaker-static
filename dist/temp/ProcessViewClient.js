
/* jshint esnext: true */

const { promosifyClientCall } = require('ClientUtils');
const { ModelStatus } = require('DatabaseUtils');

const executeSendEmail = require('Notification').executeSendEmail;
const getUrlOfView = require('UrlUtils').getUrlOfView;
const getEmailBody = require('Notification').getEmailBody;
const RiskAssessmentStatuses = require('RiskAssessmentConst').RiskAssessmentStatuses;
const promosifyServerCall = require('ServerUtils').promosifyServerCall;

const loadProcessID = promosifyClientCall((loadConfig) => app.datasources.ProcessInfoByID.load(loadConfig));
const loadRiskAssessmentID = promosifyClientCall((loadConfig) => app.datasources.RiskAssessmentByID.load(loadConfig));
const loadProcessesWithRA = promosifyClientCall((loadConfig) => app.datasources.FilteredProcessWithRAScript.load(loadConfig));
const loadRiskAssessmentHistoryById = promosifyClientCall((loadConfig) => app.datasources.FilteredProcessWithRAScriptByProcessID.load(loadConfig));
const loadRiskDriverByProcessId = promosifyClientCall((loadConfig) => app.datasources.RiskDriverByProcessId.load(loadConfig));
const loadControlsByRiskID = promosifyClientCall((loadConfig) => app.datasources.ControlsByRiskID.load(loadConfig));
const loadGapsByControlID = promosifyClientCall((loadConfig) => app.datasources.GapsByControlID.load(loadConfig));
const surveyByProcessID = promosifyClientCall((loadConfig) => app.datasources.PreRASurveyResultsByProcessID.load(loadConfig));
const questionnaireAnswersByProcessID = promosifyClientCall((loadConfig) => app.datasources.RAQuestionnaireAnswersByProcessID.load(loadConfig));
const questionnaireResultsByProcessID = promosifyClientCall((loadConfig) => app.datasources.RAQuestionnaireResultsByProcessID.load(loadConfig));

/**
 * @readonly
 * @enum {string}
 */
const UrlParams = {
  Tab: 'tab',
  ProcessID: 'processID',
  RiskAssessmentID: 'raid',
};

/**
 * @readonly
 * @enum {string}
 */
const TabParamValues = {
  ProcessInfo: 'process',
  RiskInfo: 'risk',
  Questionnaire: 'questionnaire',
  PreRASurvey: 'survey',
};

/**
 * @param {string} tab
 * @returns {number}
 */
function tabParamToTabNumber(tab) {
  switch (tab) {
  case TabParamValues.ProcessInfo: return 0;
  case TabParamValues.RiskInfo: return 1;
  case TabParamValues.Questionnaire: return 2;
  case TabParamValues.PreRASurvey: return 3;
  default: return 0;
  }
}

/**
 * @readonly
 * @enum {string}
 */
const ScoreOptions = {
  DeMinimis: 'De-Minimis',
  Remote: 'Remote',

  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
};

const ImpactOptions = [
  ScoreOptions.DeMinimis,
  ScoreOptions.Low,
  ScoreOptions.Medium,
  ScoreOptions.High,
];

const OccurrenceOptions = [
  ScoreOptions.Remote,
  ScoreOptions.Low,
  ScoreOptions.Medium,
  ScoreOptions.High,
];

/**
 * @param {ScoreOptions} value
 * @returns {number}
 */
function scoreToNumber(value) {
  return value === ScoreOptions.Low ? 1 : 3;
}

/**
 * @param {number} value
 * @returns {ScoreOptions}
 */
function scoreToString(value) {
  return value < 8 ? ScoreOptions.Low : ScoreOptions.High;
}

/**
 * @param {Array<string>} ids
 * @returns {Promise<unknown>}
 */
function approveRiskAssessment(ids) {
  return promosifyServerCall('RiskAssessmentServer', 'approveRiskAssessment')(
    [
      JSON.stringify(ids),
    ]
  );
}

function openProcessViewPageHandler(widget) {
  var datasource = widget.datasource;
  var clickedProcessItemIndex = app.datasources.Process.items.toArray().findIndex(function(item) { return item.ProcessID === datasource.item.ProcessID; });
  app.datasources.Process.itemIndex = clickedProcessItemIndex !== -1 ? clickedProcessItemIndex : app.datasources.Process.itemIndex;
  app.datasources.ProcessInfoByID.properties.ProcessID = clickedProcessItemIndex !== -1 ? app.datasources.Process.items.get(clickedProcessItemIndex).ProcessID : null;
  app.datasources.ProcessInfoByID.item = null;
  app.datasources.RiskAssessmentByID.query.parameters.RAID = datasource.item.RAID;
  app.datasources.RiskAssessmentByID.item = null;

  app.datasources.FilteredProcessWithRAScriptByProcessID.unload();
}


// ----- QUESTIONNAIRE -----

const QuestionnaireOptions = [ScoreOptions.Low, ScoreOptions.Medium, ScoreOptions.High];

/**
 * @param {ModelStatus} status
 * @returns {void}
 */
function setQuestionnaireStatus(status) {
  app.view.properties['questionnaireStatus'] = status;
}

/**
 * @returns {boolean}
 */
function isQuestionnaireInProgress() {
  return (
    app.datasources.RAQuestionnaireResultsByProcessID.items !== null && app.datasources.RAQuestionnaireResultsByProcessID.items.size !== 0 &&
    app.datasources.RAQuestionnaireResultsByProcessID.item !== null && app.datasources.RAQuestionnaireResultsByProcessID.item.status === ModelStatus.InProgress
  );
}

function isQuestionnaireCompleted() {
  return (
    app.datasources.RAQuestionnaireResultsByProcessID.items !== null && app.datasources.RAQuestionnaireResultsByProcessID.items.size !== 0 &&
    app.datasources.RAQuestionnaireResultsByProcessID.item !== null && app.datasources.RAQuestionnaireResultsByProcessID.item.status === ModelStatus.Done
  );
}

/**
 * @param {Widget} panel
 * @returns {Widget}
 */
function getQuestionnaireNumberWidget(panel) {
  return panel.descendants._values.get(0);
}

/**
 * @param {Widget} panel
 * @returns {Widget}
 */
function getQuestionnaireRatingWidget(panel) {
  return panel.descendants._values.get(4);
}

/**
 * @param {Widget} panel
 * @returns {Widget}
 */
function getQuestionnaireCommentWidget(panel) {
  return panel.descendants._values.get(5).descendants._values.get(0);
}

function updateQuestionnaireStatus() {
  if (app.datasources.ProcessInfoByID.items === null || app.datasources.ProcessInfoByID.items.size === 0) {
    setQuestionnaireStatus(ModelStatus.Unknown);
  } else if (isQuestionnaireCompleted()) {
    setQuestionnaireStatus(ModelStatus.Done);
  } else if (isQuestionnaireInProgress()) {
    setQuestionnaireStatus(ModelStatus.InProgress);
  } else {
    setQuestionnaireStatus(ModelStatus.NotStarted);
  }
}

/**
 * @param {Widget} widget
 * @returns {Promise<unknown>}
 */
function saveQuestionnaire(widget) {
  const tableBody = app.view.getDescendant('QuestionnaireTableBody');
  const rows = tableBody.getDescendantsByClass('app-quesionnaireTableRow');

  let firstNotValid = 9999;
  const allFieldsValid = rows.reduce((prev, w, i) => {
    const valid = getQuestionnaireCommentWidget(w).validate();

    if (!valid && i < firstNotValid) {
      firstNotValid = i;
    }

    return valid && prev;
  }, true);

  if (!allFieldsValid) {
    const notValidElement = getQuestionnaireCommentWidget(rows[firstNotValid]);

    if (notValidElement) {
      notValidElement.getElement().scrollIntoView();
    }

    return Promise.resolve();
  }

  widget.enabled = false;

  const id = app.datasources.ProcessInfoByID.properties.ProcessID;
  const data = rows.map(row => ({
    question: getQuestionnaireNumberWidget(row).text,
    rating: getQuestionnaireRatingWidget(row).value, comment: getQuestionnaireCommentWidget(row).properties.text,
  }));

  return promosifyServerCall('QuestionnaireServer', 'saveQuestionnaireAnswers')(
    [
      id,
      JSON.stringify(data),
    ]
  ).then(() => questionnaireResultsByProcessID())
    .then(() => {
      updateQuestionnaireStatus();
      widget.enabled = true;
    });
}

const gpoQuestionnaireNotificationHeader = 'New Questionnaire to review';

/**
 * @param {string | null} recipient
 * @param {number | null} processID
 * @param {string | null} processName
 * @param {number | null} riskAssessmentID
 * @returns {Promise<unknown>}
 */
function notifyGPOAboutQuestionnaireCompletion(recipient, processID, processName, riskAssessmentID) {
  const params = { [UrlParams.Tab]: TabParamValues.Questionnaire, [UrlParams.ProcessID]: processID, [UrlParams.RiskAssessmentID]: riskAssessmentID };
  const notificationBody = `Hi Program Lead, GPM has completed the questionary for ${processName}, please view the results here - ${getUrlOfView(app.views.ProcessView, params)}`;

  return executeSendEmail([recipient], gpoQuestionnaireNotificationHeader, getEmailBody(notificationBody));
}

function submitQuestionnaireHandler(widget) {
  const tableBody = app.view.getDescendant('QuestionnaireTableBody');
  const rows = tableBody.getDescendantsByClass('app-quesionnaireTableRow');

  let firstNotValid = 9999;
  const allFieldsValid = rows.reduce((prev, w, i) => {
    const valid = getQuestionnaireCommentWidget(w).validate();

    if (!valid && i < firstNotValid) {
      firstNotValid = i;
    }

    return valid && prev;
  }, true);

  if (!allFieldsValid) {
    const notValidElement = getQuestionnaireCommentWidget(rows[firstNotValid]);

    if (notValidElement) {
      notValidElement.getElement().scrollIntoView();
    }

    return;
  }

  widget.enabled = false;

  const id = app.datasources.ProcessInfoByID.properties.ProcessID;

  const data = rows.map(row => ({
    question: getQuestionnaireNumberWidget(row).text,
    rating: getQuestionnaireRatingWidget(row).value, comment: getQuestionnaireCommentWidget(row).properties.text,
  }));

  var item = app.datasources.ProcessInfoByID.item;
  var riskAssessment = app.datasources.RiskAssessmentByID.item;

  return promosifyServerCall('QuestionnaireServer', 'completeQuestionnaire')(
    [
      id,
      JSON.stringify(data),
    ]
  ).then(() => {
    notifyGPOAboutQuestionnaireCompletion(item.GPO, item.ProcessID, item.ProcessName, riskAssessment.RAID);

    return questionnaireResultsByProcessID();
  })
    .then(() => {
      updateQuestionnaireStatus();

      widget.enabled = true;
    });
}

function updateQuestionnaireUI() {
  const tableBody = app.view.getDescendant('QuestionnaireTableBody');
  const rows = tableBody.getDescendantsByClass('app-quesionnaireTableRow');
  const answers = app.datasources.RAQuestionnaireAnswersByProcessID.items ? app.datasources.RAQuestionnaireAnswersByProcessID.items.toArray() : [];

  /**
   * @type {Record<string, number>}
   */
  const map = {};

  for (let i = 0; i < rows.length; i++) {

    const row = /** @type {Widget} */ (rows[i]);

    map[getQuestionnaireNumberWidget(row).text] = i;
    getQuestionnaireRatingWidget(row).value = ScoreOptions.Low;
    getQuestionnaireCommentWidget(row).properties.text = '';
  }

  for (let i = 0; i < answers.length; i++) {
    let answer = /** @type {RAQuestionnaireAnswers} */ (answers[i]);
    let index = map[String(answer.QuestionNumber)];

    if (index !== undefined) {
      const row = rows[index];

      getQuestionnaireRatingWidget(row).value = answer.Rating;
      getQuestionnaireCommentWidget(row).properties.text = answer.Comments;
    }
  }
}

/**
 *
 * @param {boolean} processByIDLoading
 * @param {boolean} processByIDLoaded
 * @param {boolean} questionnaireResultsByProcessIDLoading
 * @param {boolean} questionnaireByProcessIDLoaded
 * @param {ModelStatus} status
 * @returns {boolean}
 */
function isQuestionnaireUICompleted(
  processByIDLoading, processByIDLoaded,
  questionnaireResultsByProcessIDLoading, questionnaireByProcessIDLoaded,
  status
) {
  return (
    !processByIDLoading &&
    processByIDLoaded &&
    !questionnaireResultsByProcessIDLoading &&
    questionnaireByProcessIDLoaded &&
    (status !== ModelStatus.Unknown && status !== ModelStatus.Done)
  );
}

// ----- SURVEY -----

const SurveyQuestionnaireOptions = [ScoreOptions.Low, ScoreOptions.High];

function setSurveyScore(score) {
  app.view.properties.preRASurveyScore = score;
}

function setSurveyStatus(status) {
  app.view.properties.preRASurveyStatus = status;
}

function isPreSurveyCompleted() {
  return app.datasources.PreRASurveyResultsByProcessID.items.size !== 0 && app.datasources.PreRASurveyResultsByProcessID.item.status === ModelStatus.Done;
}

function isSubmitAvaliable(status) {
  return status !== ModelStatus.Done;
}

function getSurveyScoreLabelText(score) {
  return 'Thanks for the submission, complexity score is calculated\n' +
                       `Complexity - ${scoreToString(score)}\n` +
                       `Complexity Score - ${score}`;
}

function updateSurveySubmitButton() {
  if (app.datasources.ProcessInfoByID.items.size === 0) {
    setSurveyStatus(ModelStatus.Unknown);
  } else if (!isPreSurveyCompleted()) {
    setSurveyStatus(ModelStatus.NotStarted);
  } else {
    const score = app.datasources.PreRASurveyResultsByProcessID.item.ComplexityScore;

    setSurveyStatus(ModelStatus.Done);
    setSurveyScore(score);
  }
}

function onCompleteSurvey(ids, newValue, complexityScore) {
  return promosifyServerCall('RiskAssessmentServer', 'onCompleteSurvey')(
    [
    // To send an object to the script
      JSON.stringify(ids),
      newValue,
    ]
  ).then(() => promosifyServerCall('PreRiskAssessmentSurveyServer', 'saveSurveyResult')([ids[0], complexityScore]));
}

function getScoreLabelWidget(panel) {
  return panel.descendants._values.get(5);
}

const gpoPreRASurveyNotificationHeader = 'New Pre RA Survey to review';

/**
 * @param {string | null} recipient
 * @param {number | null} processID
 * @param {string | null} processName
 * @param {string} complexity
 * @param {number | null} riskAssessmentID
 * @returns {Promise<unknown>}
 */
function notifyGPOAboutPreRASurveyCompletion(recipient, processID, processName, complexity, riskAssessmentID) {
  const params = { [UrlParams.Tab]: TabParamValues.PreRASurvey, [UrlParams.ProcessID]: processID, [UrlParams.RiskAssessmentID]: riskAssessmentID };
  const notificationBody = `Hi Program Lead, GPM has completed the pre survey for ${processName}, the complexity is calculated as ${complexity}, please view the results here - ${getUrlOfView(app.views.ProcessView, params)}`;

  return executeSendEmail([recipient], gpoPreRASurveyNotificationHeader, getEmailBody(notificationBody));
}

function submitSurveyHandler(widget) {
  var tableBody = app.view.getDescendant('PreSurveyQuestionnaireTableBody');
  var scoreWidgets = tableBody.getDescendantsByClass('app-complexityScoreLabelColumn');
  var score = scoreWidgets.reduce(function (score, w) { return score + Number(w.text); }, 0);

  var item = app.datasources.ProcessInfoByID.item;
  var riskAssessment = app.datasources.RiskAssessmentByID.item;

  widget.enabled = false;

  onCompleteSurvey([item.ProcessID], RiskAssessmentStatuses.GpmCompletedRASurvey, score)
    .then((r) => {
      notifyGPOAboutPreRASurveyCompletion(item.GPO, item.ProcessID, item.ProcessName, scoreToString(score), riskAssessment.RAID);

      return surveyByProcessID();
    })
    .then((r) => {
      updateSurveySubmitButton();

      widget.enabled = true;
    });
}

function isPreSurveyUICompleted(
  processByIDLoading, processByIDLoaded, processByIDItemsSize,
  preRASurveyResultsByProcessIDLoading, preRASurveyResultsByProcessIDLoaded, preRASurveyResultsByProcessIDItemsSize, preRASurveyResultsByProcessIDItem
) {
  return (
    !processByIDLoading &&
    processByIDLoaded &&
    processByIDItemsSize !== 0 &&
    !preRASurveyResultsByProcessIDLoading &&
    preRASurveyResultsByProcessIDLoaded &&
    (
      preRASurveyResultsByProcessIDItemsSize === 0 ||
      preRASurveyResultsByProcessIDItem.status !== ModelStatus.Done
    )
  );
}

// ----- Process View -----

function getProcessIDofPage() {
  return app.datasources.ProcessInfoByID.items.size > 0 ? app.datasources.ProcessInfoByID.items.get(0).ProcessID : app.datasources.ProcessInfoByID.properties.ProcessID;
}

function isProcessApprovalButtonVisible(processLoading, processLoaded, gpo) {
  // TODO: check maybe it won't update if FilteredProcessWithRAScript is changed
  // TODO: should be the latest ra (what does it mean "the latest ra")
  const processID = getProcessIDofPage();
  const ra = app.datasources.FilteredProcessWithRAScript.items ? app.datasources.FilteredProcessWithRAScript.items.toArray().filter(ra => ra.ProcessID === processID)[0] : undefined;
  const isAwaitingForApproval = ra && ra.RAStatus ===  RiskAssessmentStatuses.GpmAwatingApproval;

  return !processLoading && processLoaded && app.user.email === gpo && isAwaitingForApproval;
}

function onProcessApproveHandler(widget) {
  widget.enabled = false;

  const processID = getProcessIDofPage();
  const raids = app.datasources.FilteredProcessWithRAScript.items ? app.datasources.FilteredProcessWithRAScript.items.toArray().filter(ra => ra.ProcessID === processID).map(ra => ra.RAID) : [];

  if (raids.length !== 0) {
    approveRiskAssessment(raids)
      .then(loadProcessesWithRA)
      .then(() => widget.enabled = true);
  } else {
    widget.enabled = true;
  }
}

function getUIStatus(status) {
  switch (status) {
  case ModelStatus.Unknown: return 'Unknown';
  case ModelStatus.NotStarted: return 'Not Started';
  case ModelStatus.InProgress: return 'In Progress';
  case ModelStatus.Done: return 'Completed';
  default: return 'Unknown';
  }
}

function getUIStatusString(status) {
  return 'Status: ' + getUIStatus(status);
}

function getProcessViewSurveyPage(processID) {
  return { [UrlParams.Tab]: TabParamValues.PreRASurvey, [UrlParams.ProcessID]: processID };
}

function getPageURLParams() {
  const tabValue = app.getUrlParameter(UrlParams.Tab);
  const processId = app.getUrlParameter(UrlParams.ProcessID);
  const riskAssessmentId = app.getUrlParameter(UrlParams.RiskAssessmentID);

  const params = {
    tabValue, processId, riskAssessmentId,
  };

  return params;
}

function updatePageUI() {
  setSurveyStatus(ModelStatus.Unknown);
  setQuestionnaireStatus(ModelStatus.Unknown);
}

function initPageDataByURLParams(tabWidget, params) {
  const { tabValue, processId, riskAssessmentId } = params;

  tabWidget.selectedTab = tabParamToTabNumber(tabValue);

  const isProcessIDCorrect = processId !== null && !Number.isNaN(Number(processId));
  const isRiskAssessmentIDCorrect = riskAssessmentId !== null && !Number.isNaN(Number(riskAssessmentId));

  if (isProcessIDCorrect) {
    app.datasources.ProcessInfoByID.properties.ProcessID = Number(processId);
  }

  if (isRiskAssessmentIDCorrect) {
    app.datasources.RiskAssessmentByID.query.parameters.RAID = Number(riskAssessmentId);
  }
}

exports.onSelectRisk = function(risk) {
  app.executeRemoteScript('ProcessViewServer', 'hasControls', [risk.datasource.item.RiskID], function(hasControls) {
    if (hasControls) {
      app.datasources.ControlsByRiskID.load();
    } else {
      app.datasources.GapsByControlID.unload();
      app.datasources.ControlsByRiskID.unload();
    }
  });
};

exports.onSelectControl = function(risk) {
  app.datasources.GapsByControlID.load();
};

exports.onSubmitRisk = function(dialog, submitEvent) {
  var form = dialog.root.descendants.RiskForm;

  if (form.validate()) {
    dialog.datasource.draftRecord.ProcessID = app.datasources.ProcessInfoByID.properties.ProcessID;

    dialog.datasource.create();

    app.closeDialog();
  }
};

exports.onSubmitControl = function(dialog, submitEvent) {
  var form = dialog.root.descendants.ControlForm;

  if (form.validate()) {
    dialog.datasource.draftRecord.RiskID = app.datasources.RiskDriverByProcessId.item.RiskID;

    dialog.datasource.create();
    dialog.datasource.saveChanges();

    app.closeDialog();
  }
};

exports.onSubmitGap = function(dialog, submitEvent) {
  var form = dialog.root.descendants.GapForm;

  if (form.validate()) {
    dialog.datasource.draftRecord.ControlId = app.datasources.ControlsByRiskID.item.ControlID;

    dialog.datasource.create(function () {
      // TODO: check
      loadProcessID();
    });
    dialog.datasource.saveChanges();

    app.closeDialog();
  }
};

exports.onLoadRisks = function() {
  app.datasources.ControlsByRiskID.load(function() {
    app.datasources.GapsByControlID.load();
  });
};

exports.onLoadControls = function() {
  app.datasources.GapsByControlID.load();
};

exports.loadAllTables = function() {
  loadRiskDriverByProcessId()
    .then(() => loadControlsByRiskID())
    .then(() => loadGapsByControlID());
};

function loadPageData() {
  if (!app.datasources.FilteredProcessWithRAScript.loading && !app.datasources.FilteredProcessWithRAScript.loaded && getProcessIDofPage()) {
    loadProcessesWithRA();
  }

  const processPromise = loadProcessID()
    .then(() => {
      app.datasources.PreRASurveyResultsByProcessID.properties.ProcessID = getProcessIDofPage();
      app.datasources.RAQuestionnaireAnswersByProcessID.properties.ProcessID = getProcessIDofPage();
      app.datasources.RAQuestionnaireResultsByProcessID.properties.ProcessID = getProcessIDofPage();
      app.datasources.FilteredProcessWithRAScriptByProcessID.properties.ProcessID = getProcessIDofPage();

      exports.loadAllTables();

      return Promise.allSettled([
        loadRiskAssessmentHistoryById(),
        surveyByProcessID().then(() => updateSurveySubmitButton()),
        questionnaireAnswersByProcessID().then(() => updateQuestionnaireUI()),
        questionnaireResultsByProcessID().then(() => updateQuestionnaireStatus()),
      ]);
    });
  const riskAssessmentPromise = app.datasources.RiskAssessmentByID.query.parameters.RAID !== null ? loadRiskAssessmentID() : Promise.resolve();

  return Promise.allSettled([processPromise, riskAssessmentPromise]);
}

function onTabsLoad(widget) {
  const params = getPageURLParams();
  const currentUrl = window.location.href;

  let updatedUrl;
  if (params.processId !== null || params.tabValue !== null || params.riskAssessmentId !== null) {
    updatedUrl = currentUrl
      .replace(window.location.search, '');

    history.pushState({}, null, app.sanitizer.sanitizeUrl(updatedUrl));
  }

  initPageDataByURLParams(widget, params);

  updatePageUI();

  loadPageData();
}

exports.SurveyQuestionnaireOptions = SurveyQuestionnaireOptions;
exports.QuestionnaireOptions = QuestionnaireOptions;
exports.ImpactOptions = ImpactOptions;
exports.OccurrenceOptions = OccurrenceOptions;

exports.scoreToString = scoreToString;
exports.scoreToNumber = scoreToNumber;
exports.getScoreLabelWidget = getScoreLabelWidget;
exports.submitSurveyHandler = submitSurveyHandler;
exports.isPreSurveyUICompleted = isPreSurveyUICompleted;
exports.getSurveyScoreLabelText = getSurveyScoreLabelText;

exports.tabParamToTabNumber = tabParamToTabNumber;
exports.onTabsLoad = onTabsLoad;
exports.getProcessViewSurveyPage = getProcessViewSurveyPage;
exports.getUIStatusString = getUIStatusString;
exports.isSubmitAvaliable = isSubmitAvaliable;

exports.saveQuestionnaire = saveQuestionnaire;
exports.submitQuestionnaireHandler = submitQuestionnaireHandler;
exports.getQuestionnaireRatingWidget = getQuestionnaireRatingWidget;
exports.getQuestionnaireCommentWidget = getQuestionnaireCommentWidget;
exports.isQuestionnaireUICompleted = isQuestionnaireUICompleted;

exports.isProcessApprovalButtonVisible = isProcessApprovalButtonVisible;
exports.onProcessApproveHandler = onProcessApproveHandler;
exports.openProcessViewPageHandler = openProcessViewPageHandler;
