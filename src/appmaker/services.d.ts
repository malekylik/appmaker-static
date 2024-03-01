declare interface IssueTrackerIssueState {
  title: string;
  status: 'NEW'
  | 'INTENDED_BEHAVIOR'
  | 'INFEASIBLE'
  | 'ACCEPTED'
  | 'DUPLICATE'
  | 'ASSIGNED'
  | 'STATUS_UNSPECIFIED'
  | 'FIXED'
  | 'VERIFIED'
  | 'OBSOLETE'
  | 'NOT_REPRODUCIBLE';
}

declare interface IssueTrackerIssue {
  issueId: string;
  issueState: IssueTrackerIssueState;
}

declare interface IssueTrackerFormattedComment {

}

declare interface IssueTrackerIssueComment {
  issueId: string;
  comment: string | undefined;
  // This field is only present when IssueCommentView is set to FULL
  formattedComment: IssueTrackerFormattedComment | undefined;
  formattingMode: 'UNSPECIFIED_FORMATTING_MODE'
  | 'PLAIN'
  | 'MARKDOWN'
  | 'LITERAL';
}

declare module 'services' {
  interface IssueTrackerCommentsAPI {
    list: (options?: { params?: { issueId?: string } }) => { issueComments: Array<IssueTrackerIssueComment>; };
  }

  interface IssueTrackerIssuesAPI {
    list: (options?: { params?: { query?: string } }) => { issues: Array<IssueTrackerIssue>; totalSize: number; };
    // TODO: request should Issue like object
    create: (options?: { request?: Record<string, unknown>; }) => IssueTrackerIssue;

    comments: IssueTrackerCommentsAPI;
  }

  interface IssueTracker {
    issues: IssueTrackerIssuesAPI;
  }

  interface Services {
    issuetracker: IssueTracker;
  }

  const services: Services;

  export = services;
}
