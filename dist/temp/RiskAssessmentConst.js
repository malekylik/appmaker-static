/* jshint esnext: true */

const RiskAssessmentStatuses = {
  GpmCompletedRASurvey: 'GPM Completed RA Survey',

  NotStated: 'Not Started',
  GpoPendingApproval: 'Pending GPO Approval',
  PendingAssignment: 'Pending Assignment',
  InProgress: 'In Progress',
  DocumentationReview: 'Documentation Review',
  AwaitingInformation: 'Awaiting Information',
  OngoingWalkthroughs: 'Ongoing Walkthroughs',
  GpmAwatingApproval: 'Final - Awaiting GPM Approval',
  Approved: 'Final - Approved',
  ProcessDeprioritized: 'Process Deprioritized',
  PendingScopingChange: 'Pending Scoping Change Approval',
};

exports.RiskAssessmentStatuses = RiskAssessmentStatuses;
