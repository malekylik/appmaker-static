
    declare type List<T> = {
      toArray(): Array<T>;
    }
    
    declare type Datasource<T> = {
      item: T | null;
      items: List<T> | null;
    
      load(config?: { success: () => void; failure?: (e: Error) => void }): void;
      unload(): void;
    };
    
    type WidgetCommon = {
      root: LayoutWidget;
      getDescendant(name: string): Widget | null;
      getDescendantsByClass(name: string): Array<Widget>;
    }
    
    declare type LayoutWidget = {
    } & WidgetCommon;
    
    declare type Panel = {
      styleName: string;
      // TODO: thing about genereting
      children: Record<string, Widget | undefined>;
      // TODO: think about generating
      properties: Record<string, string>;
    } & WidgetCommon;
    
    declare type Widget = Panel | LayoutWidget;
    
    declare const app: {
      view: Panel;
      // TODO: can be generated
      views: {
        AddControlDialog: Widget;
AddGapDialog: Widget;
AddRDriverDialog: Widget;
EditControlDialog: Widget;
EditGapDialog: Widget;
EditProcess: Widget;
EditRDriverDialog: Widget;
MainView: Widget;
MyTasks: Widget;
ProcessView: Widget;
ProcessesScope: Widget;
RiskAssesmentView: Widget;
      };
      // TODO: can be generated
      viewFragments: {
        DialogModal: Widget;
Menu: Widget;
Navbar: Widget;
NotificationWidget: Widget;
ProcessInfoHeader: Widget;
ProcessListDialog: Widget;
RAChangeRequestDialog: Widget;
RestrictedTextArea: Widget;
      };
      // TODO: think about generating
      datasources: {
        ControlsByRiskID: Datasource<Controls>;
GapsByControlID: Datasource<Gaps>;
PreRASurveyResults: Datasource<PreRASurveyResults>;
PreRASurveyResultsByProcessID: Datasource<PreRASurveyResults>;
PreSurveyQuestionnaire: Datasource<PreSurveyQuestionnaire>;
Process: Datasource<Process>;
defaultProcessInfo_NotUsed: Datasource<ProcessInfo>;
ProcessInfoByID: Datasource<ProcessInfo>;
defaultDatasourceForProcessRA_NotUsed: Datasource<ProcessRA>;
FilteredProcessWithRA: Datasource<ProcessRA>;
GPOProcessRA: Datasource<ProcessRA>;
MyTasks: Datasource<ProcessRA>;
RADates: Datasource<ProcessRA>;
RCOProcesses: Datasource<ProcessRA>;
RAQuestionnaire: Datasource<RAQuestionnaire>;
RAQuestionnaireAnswers: Datasource<RAQuestionnaireAnswers>;
RAQuestionnaireAnswersByProcessID: Datasource<RAQuestionnaireAnswers>;
RAQuestionnaireResults: Datasource<RAQuestionnaireResults>;
RAQuestionnaireResultsByProcessID: Datasource<RAQuestionnaireResults>;
RiskAssessment: Datasource<RiskAssessment>;
RiskAssessmentByID: Datasource<RiskAssessment>;
RiskAssessmentByProcessID: Datasource<RiskAssessment>;
RiskDriverByProcessId: Datasource<RiskDriver>;
      };
      sanitizer: { sanitizeUrl(url: string): string;  };
    
      executeRemoteScript<A extends Array<unknown>, R>(scriptName: string, functionName: string, args: A, callback: (result: R) => void): void;
    
      closeDialog(): void;
    };
    
    declare type Controls = {
ControlID: number | null;
RiskID: number;
CreationDate: Date;
ControlDescription: string;
GPM: string;
ControlOwner: string;
ControlCategory: string;
ControlSubCategory: string;
ControlType: string;
ControlClassification: string;
ControlOperation: string;
ControlFrequency: string;
ControlSignificance: string;
ControlDocumentation: string;
DesignEffectiveness: string;
OperationalEffectiveness: string;
ControlEffectiveness: string;
Reactivity: string | null;
OperationType: string | null;
DesignAdequacyRating: string | null;
};

declare type Gaps = {
GapId: number | null;
ControlId: number;
GapRiskStatement: string;
GapSeverity: string;
GapType: string;
GapDescription: string;
RiskTreatmentPlan: string;
GapRemediationPlan: string | null;
GapRootCause: string;
GapIdentificationSource: string;
GapIdentificationDate: Date;
RemediationDate: Date | null;
AssertionDate: Date | null;
EnteredBy: string;
Responsible: string;
Accountable: string;
RepeatFailure: boolean;
Consulted: string;
Informed: string | null;
GapStatus: string;
controls_fk: number | null;
DateAdded: Date | null;
GapRiskCategory: string | null;
GapRiskRating: string | null;
GapOwner: string | null;
GapDocumentationLink: string | null;
DaysOutstanding: number | null;
};

declare type PreRASurveyResults = {
id: number | null;
Score: string | null;
RAID: number | null;
status: string | null;
riskAssessment_fk: number | null;
ComplexityScore: number | null;
};

declare type PreSurveyQuestionnaire = {
QuestionNumber: number | null;
ComplexityCategory: string | null;
Question: string | null;
Guidance: string | null;
Score: string | null;
Comments: string | null;
QuestionNumberSubcategory: number | null;
riskAssessment_fk: number | null;
};

declare type Process = {
ProcessID: number | null;
HCProcessId: string | null;
ProcessName: string | null;
ProcessDescription: string | null;
ProcessCreationDate: Date | null;
GPM: string | null;
GPO: string | null;
RCOTower: string | null;
RCOSubTower: string | null;
DocumentUrl: string | null;
DocumentLastUpdated: Date | null;
Complexity: string | null;
Frequency: string | null;
ProcessInherentRiskRating: string | null;
ProcessControlEffectiveness: string | null;
ProcessResidualRiskRating: string | null;
O2CMapping: string | null;
ProcessRollUp: string | null;
PDDOwner: string | null;
OutstandingGaps: number | null;
OperationsLead: string | null;
};

declare type ProcessInfo = {
ProcessID: number | null;
HCProcessId: string | null;
ProcessName: string | null;
ProcessDescription: string | null;
ProcessCreationDate: Date | null;
GPM: string | null;
GPO: string | null;
RCOTower: string | null;
RCOSubTower: string | null;
DocumentUrl: string | null;
DocumentLastUpdated: string | null;
Complexity: string | null;
Frequency: string | null;
ProcessInherentRiskRating: string | null;
ProcessControlEffectiveness: string | null;
ProcessResidualRiskRating: string | null;
O2CMapping: string | null;
ProcessRollUp: string | null;
PDDOwner: string | null;
OutstandingGaps: number | null;
OperationsLead: string | null;
};

declare type ProcessRA = {
HCProcessId: string | null;
RALead: string | null;
ProcessName: string | null;
GPM: string | null;
GPO: string | null;
RCOTower: string | null;
RAFrequency: string | null;
LastRADate: Date | null;
NextRADate: Date | null;
ProcessCreationDate: Date | null;
RAID: number | null;
ProcessID: number | null;
ProcessControlEffectiveness: string | null;
ProcessResidualRiskRating: string | null;
InScope: number | null;
RAStatus: string | null;
RecordsCount: number | null;
O2CMapping: string | null;
ProcessRollUp: string | null;
RCOSubTower: string | null;
DocumentUrl: string | null;
};

declare type RAQuestionnaire = {
id: number | null;
RiskCategory: string | null;
Question: string | null;
Guidance: string | null;
QuestionNumber: string | null;
Status: string | null;
};

declare type RAQuestionnaireAnswers = {
id: number | null;
Rating: string | null;
Comments: string | null;
RAID: number | null;
QuestionNumber: string | null;
};

declare type RAQuestionnaireResults = {
id: number | null;
RAID: number | null;
status: string | null;
};

declare type RiskAssessment = {
RAID: number | null;
ProcessID: number | null;
RAStatus: string | null;
RAScope: string | null;
RAFrequency: string | null;
RALead: string | null;
LastRADate: Date | null;
NextRADate: Date | null;
GPMApproval: boolean | null;
GPMApprovalDate: Date | null;
GPOApproval: boolean | null;
GPOApprovalDate: Date | null;
process_fk: number | null;
};

declare type RiskDriver = {
RiskID: number | null;
ProcessID: number;
CreationDate: Date;
RiskDriverDescription: string;
RiskDriverLikelihood: string;
RiskDriverImpact: string;
RiskDriverCategory: string;
RiskDriverSubCategory: string;
FinancialImpact: string;
OperationalImpact: string;
ReputationalImpact: string;
LegalComplianceImpact: string;
InherentRiskRating: string | null;
ControlEffectiveness: string | null;
ResidualRiskRating: string | null;
RiskCreationDate: Date;
process_fk: number | null;
};