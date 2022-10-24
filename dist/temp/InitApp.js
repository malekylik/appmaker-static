/* jshint esnext: true */

const { RiskAssessmentStatuses } = require('RiskAssessmentConst');

function initDatasources() {
  const currentDate = new Date();

  app.datasources.RCOProcesses.properties.currentDate = currentDate;

  app.datasources.FilteredProcessWithRA.properties.currentDate = currentDate;

  app.datasources.GPOProcessRA.properties.userEmail = app.user.email;
  app.datasources.GPOProcessRA.properties.raStatus = RiskAssessmentStatuses.GpoPendingApproval;

  app.datasources.MyTasks.properties.userEmail = app.user.email;

  const myTasksStatuses = app.datasources.MyTasks.properties.initStatuses();
  myTasksStatuses.add(RiskAssessmentStatuses.NotStated);
  myTasksStatuses.add(RiskAssessmentStatuses.InProgress);
  myTasksStatuses.add(RiskAssessmentStatuses.DocumentationReview);
  myTasksStatuses.add(RiskAssessmentStatuses.AwaitingInformation);
  myTasksStatuses.add(RiskAssessmentStatuses.OngoingWalkthroughs);
  myTasksStatuses.add(RiskAssessmentStatuses.Approved);

  // TODO: for future use
  const gpoProcessStatuses = app.datasources.GPOProcessRA.properties.initStatuses();
  gpoProcessStatuses.add(RiskAssessmentStatuses.GpoPendingApproval);
  gpoProcessStatuses.add(RiskAssessmentStatuses.Approved);
  
  const riskAssesmentHistoryStatuses = app.datasources.FilteredProcessWithRAScriptByProcessID.properties.initStatuses();
  riskAssesmentHistoryStatuses.add(RiskAssessmentStatuses.Approved);
}

function initApp() {
  initDatasources();
}

exports.initApp = initApp;
