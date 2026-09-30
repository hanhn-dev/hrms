export const CUSTOMER_SETTING_TABLES = [
  "TCustomerSettings",
  "TTNEEmployerConfiguration",
  "TExternal_Payroll_Configuration",
] as const;

export type CustomerSettingTable = (typeof CUSTOMER_SETTING_TABLES)[number];

export const CUSTOMER_SETTING_CATEGORY_IDS = [
  "auth",
  "employeeManagement",
  "master",
  "externalPayroll",
  "feature",
  "lms",
  "recruitment",
  "la",
  "ess",
  "te",
  "preonboarding",
  "mobile",
  "thirdParty",
  "advance",
  "retirement",
] as const;

export type CustomerSettingCategoryId =
  (typeof CUSTOMER_SETTING_CATEGORY_IDS)[number];

export type CustomerSettingValueType =
  | "bool"
  | "text"
  | "number"
  | "select"
  | "json";

export type CustomerSettingSelectOption = {
  label: string;
  value: string | number;
};

export type CustomerSettingField = {
  key: string;
  label: string;
  description?: string;
  table: CustomerSettingTable;
  column: string;
  type: CustomerSettingValueType;
  encoding?: "bit" | "yn";
  options?: CustomerSettingSelectOption[];
  min?: number;
  max?: number;
  secret?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  enabledWhen?: { key: string; value: unknown };
};

export type CustomerSettingGroup = {
  label: string;
  keys: string[];
};

export type CustomerSettingCategory = {
  id: CustomerSettingCategoryId;
  label: string;
  keys: string[];
  groups?: CustomerSettingGroup[];
};

export type CustomerSettingUiValue = string | number | boolean | null;

const CS: CustomerSettingTable = "TCustomerSettings";
const TNE: CustomerSettingTable = "TTNEEmployerConfiguration";
const PAY: CustomerSettingTable = "TExternal_Payroll_Configuration";

function boolField(
  key: string,
  label: string,
  extra: Partial<CustomerSettingField> = {},
): CustomerSettingField {
  return {
    key,
    label,
    table: CS,
    column: extra.column ?? key,
    type: "bool",
    encoding: extra.encoding ?? "bit",
    ...extra,
  };
}

function textField(
  key: string,
  label: string,
  extra: Partial<CustomerSettingField> = {},
): CustomerSettingField {
  return {
    key,
    label,
    table: CS,
    column: extra.column ?? key,
    type: extra.type ?? "text",
    ...extra,
  };
}

function numberField(
  key: string,
  label: string,
  extra: Partial<CustomerSettingField> = {},
): CustomerSettingField {
  return {
    key,
    label,
    table: CS,
    column: extra.column ?? key,
    type: "number",
    ...extra,
  };
}

function selectField(
  key: string,
  label: string,
  options: CustomerSettingSelectOption[],
  extra: Partial<CustomerSettingField> = {},
): CustomerSettingField {
  return {
    key,
    label,
    table: CS,
    column: extra.column ?? key,
    type: "select",
    options,
    ...extra,
  };
}

function jsonField(
  key: string,
  label: string,
  extra: Partial<CustomerSettingField> = {},
): CustomerSettingField {
  return {
    key,
    label,
    table: CS,
    column: extra.column ?? key,
    type: "json",
    ...extra,
  };
}

function tneBool(
  key: string,
  column: string,
  label: string,
  extra: Partial<CustomerSettingField> = {},
): CustomerSettingField {
  return boolField(key, label, { table: TNE, column, ...extra });
}

const YES_NO_GEO = [
  { label: "Trip ID Based", value: "Trip ID Based" },
  { label: "Entire Day Based", value: "Entire Day Based" },
];

export const CUSTOMER_SETTING_FIELDS: CustomerSettingField[] = [
  boolField("IsOffice365LoginEnabled", "Office 365 Login Enabled", {
    description: "Enabling this will show Office 365 authentication on the Login Page",
  }),
  textField("AzureSubscriptionKey", "Azure Subscription Key", {
    description: "Azure Application Object ID for Office 365 Login Authentication",
    secret: true,
  }),
  textField("AzureApplicationClientId", "Azure Application Client ID", {
    secret: true,
  }),
  textField("AzureApplicationTenantId", "Azure Application Tenant ID", {
    secret: true,
  }),
  textField("AzureApplicationClientSecret", "Azure Application Client Secret", {
    secret: true,
  }),
  boolField("IsEmailLoginEnabled", "Email Login Enabled"),
  boolField("IsCloudOrOnPremises", "Cloud Or OnPremises", { encoding: "yn" }),
  boolField("IsExternalLogin", "External Login"),
  textField("ExternalLogin_AppId", "External Login App ID"),
  textField("ExternalLogin_Authority", "External Login Authority"),
  textField("ExternalLoginDomains", "External Login Domains"),
  boolField("IsShowPolicyConsent", "Show Privacy Policy Consent at Login"),
  boolField("IsForgotPasswordEnabled", "Forgot Password Enabled"),

  boolField("IsStateMandatoryMyDetails", "State Mandatory My Details"),
  boolField("IsEmployeeProfileChange", "Employee Profile Change"),
  boolField("AllowChangingEmploymentNumber", "Employment Number Change"),
  boolField("IsPassportVisaMandatory", "Keep Passport & Visa Details Mandatory"),
  boolField("IsGradeEnable", "Enable Grade"),
  boolField("IsIncludeMiddleName", "Display Employee Middle Name"),
  boolField("IsCostCenterEnabled", "Show Cost Center"),
  boolField("IsEnableAutoWelcomeEmail", "Initiate Welcome Email", {
    trueLabel: "Auto",
    falseLabel: "Manual",
  }),
  numberField(
    "SendRetirementAgeNotfication",
    "Send an email to HR, L1 & L2 Manager before Retirement Age",
  ),
  boolField(
    "IsMultiplePayrollAllowed",
    "Allow multiple banks to be used for payroll",
  ),

  boolField("IsLevelMandatoryDesignation", "Level Mandatory Designation"),
  textField("BusinessUnit", "Change 'Business Unit' label to"),

  boolField("isEnabled", "Enable External Payroll", {
    table: PAY,
    column: "IsEnabled",
  }),
  textField("providerName", "Provider Name", {
    table: PAY,
    column: "ProviderName",
  }),
  textField("baseUrl", "URL link", { table: PAY, column: "BaseUrl" }),

  boolField("ShowChatModule", "Show Chat Module"),
  boolField("IsShowFeedback", "Show feedback"),
  boolField("IsShowAttendanceMode", "Show Attendance Mode"),
  boolField("IsShowManagementDashboard", "Enable Management & Module Dashboard"),
  boolField(
    "AttendanceModeIconVisible",
    "Show Check-in / Check-out Attendance Mode Icons",
  ),
  numberField(
    "MaxAttemptsToSendFrgPwdEmail",
    "Maximum Attempt To Send Forget Password Email",
  ),
  boolField("AllowPartialWorkflow", "Allow Partial Workflow", {
    description:
      "When enabled, a workflow can be saved with an incomplete approval tree.",
  }),

  boolField("IsShowPostAssessment", "Post assessment allowed for single session"),
  boolField("IsMSTeamEnabled", "Enable Microsoft Teams Integration"),
  boolField("IsWhatsAppEnabled", "Enable WhatsApp Notification"),
  boolField("IsShowTrainingSubCategory", "Make Training Sub-Category As Mandatory"),
  boolField("IsGenerateQRCode", "Generate QR Code"),
  boolField(
    "IsScreenshotEnable",
    "Enable Screenshot Facility for LMS Content (Mobile App)",
  ),
  textField("TrainingCertificateDocument", "Training Certificate Document"),
  textField("TrainerCertificateDocument", "Trainer Certificate Document"),
  numberField("RatingTypeId", "Rating Type Id"),
  numberField("RatingValue", "Rating Value"),

  boolField("IsDonorDetails", "Donor Details"),
  boolField(
    "IsAddAdditionalCcInOfferLetter",
    "Add Additional CC recipients in offer letter system email",
  ),
  boolField(
    "IsRRSApprovedFromHiringManager",
    "RRS Approval From Hiring Manager",
  ),
  boolField(
    "IsOLForCandidatePasswordProtected",
    "Recruitment-OL Password Protected",
  ),
  boolField("IsViewCTCPermissions", "View CTC Permissions"),
  boolField("IsUseBudgetApproval", "Use Budget Approval"),
  boolField(
    "IsAutoRRSCreationOnResignation",
    "Auto RRS Creation on Employee Resignation",
  ),
  boolField("IsRevisedHiring", "Enable Revised Hiring"),
  boolField("IsRevisedOffer", "Enable Revise Offer"),
  boolField(
    "IsUseRecruitmentPermission",
    "Use Recruitment Dashboard Permission",
  ),
  boolField(
    "IsEnabledWorkforceSummaryTable",
    "Enable Workforce Summary Table in RRS",
  ),
  numberField(
    "NumberOfOnHoldRemindersBeforeExpiry",
    "Number of On-Hold Reminder to be sent Before Expiry",
  ),
  numberField(
    "OnHoldActionReminders",
    "Number of On-Hold Reminder to be sent after Expiry",
  ),

  boolField("IsShowShiftRoaster", "Show Shift Roster"),
  boolField(
    "UseEmployeeDefaultShiftIfRosterNotAssigned",
    "Assign shift from employee details if roster not assigned",
    { enabledWhen: { key: "IsShowShiftRoaster", value: true } },
  ),
  boolField(
    "IsPendingLeavesIncludeInPayableDays",
    "Include Pending Leaves in Payable Days",
  ),
  selectField(
    "ShowGeoTrackingReportonMap",
    "Show Geo Tracking Report on Map",
    YES_NO_GEO,
  ),
  selectField("ReportFilterOn", "Leave Report Date Basis", [
    { label: "Effective Date", value: "T" },
    { label: "Posted Date", value: "P" },
  ]),
  selectField("AttendanceAdjustmentCriteria", "Attendance Adjustment Criteria", [
    { label: "Working Days", value: "WorkingDays" },
    { label: "Present Days", value: "PresentDays" },
  ]),
  selectField(
    "AttendanceAdjustmentHoursMode",
    "Attendance Adjustment Hours Mode",
    [
      { label: "Full Day Rule", value: "FullDayRule" },
      { label: "Shift Start End", value: "ShiftStartEnd" },
    ],
  ),
  boolField(
    "ShiftOnEarlyShiftStartTime",
    "Use Early Punch-In for Shift Assignment",
  ),
  boolField(
    "ConsiderPunchesWithinShiftBracket",
    "Consider Punches Within Shift Time Range",
  ),
  jsonField(
    "LeaveAttendanceRiskPolicySettings",
    "L&A Risk Policy Settings",
  ),
  boolField("ShowCheckInOutForAutoPresent", "Show Timing For Auto Present"),
  boolField(
    "EnableOpeningBalanceAdjustment",
    "Enable Opening Balance adjustments through Leave Balance Adjustments page",
    { column: "IsOpeningBalanceAdjustmentEnabled" },
  ),
  selectField(
    "weeklySummaryCalculationScope",
    "Weekly Summary Calculation Scope",
    [
      { label: "Strict Month Week", value: "StrictMonth" },
      { label: "Full Week", value: "FullWeek" },
    ],
    { column: "WeeklySummaryCalculationScope" },
  ),
  selectField(
    "calendarViewMode",
    "Calendar View Mode",
    [
      { label: "Strict Month Data", value: "StrictMonthData" },
      {
        label: "Show month's data with adjacent months data",
        value: "ShowAdjacentMonthsData",
      },
    ],
    { column: "CalendarViewMode" },
  ),
  selectField(
    "weeklyOffMonthlySummaryCalculationScope",
    "Weekly Off Monthly Summary Scope",
    [
      { label: "Upto Today", value: "UptoToday" },
      { label: "Entire Month", value: "EntireMonth" },
    ],
    { column: "WeeklyOffScope" },
  ),
  selectField(
    "holidayMonthlySummaryCalculationScope",
    "Holiday Monthly Summary Scope",
    [
      { label: "Upto Today", value: "UptoToday" },
      { label: "Entire Month", value: "EntireMonth" },
    ],
    { column: "HolidayScope" },
  ),
  selectField(
    "leaveMonthlySummaryCalculationScope",
    "Leave Monthly Summary Scope",
    [
      { label: "Upto Today", value: "UptoToday" },
      { label: "Entire Month", value: "EntireMonth" },
    ],
    { column: "LeaveScope" },
  ),
  boolField("RotationalRoster", "Enable Rotational Roster", {
    column: "IsPatternBasedRosterEnabled",
    enabledWhen: { key: "IsShowShiftRoaster", value: true },
  }),
  boolField(
    "IsShowHalfDayWeeklyOffInRoaster",
    "Enable Half Day Weekly-Offs in Roster",
    { enabledWhen: { key: "IsShowShiftRoaster", value: true } },
  ),
  boolField(
    "IsShowHalfDayHolidayInRoaster",
    "Enable Half Day Holiday in Roster",
    { enabledWhen: { key: "IsShowShiftRoaster", value: true } },
  ),
  boolField("AllowLeaveIfPresent", "Apply Leave On Present Day"),
  boolField("UnfreezePolicy", "Freeze Date Unfreeze Policy"),
  boolField(
    "IsLeaveLapseNotificationApplicable",
    "Send Email Leave Processing Details to Employee(s)",
    { column: "IsLeaveLapseNotificationEnabled" },
  ),
  boolField("displayLogInOutDeviceIcons", "Log In/Out Device Icons", {
    column: "DisplayLogInLogOutIcon",
  }),
  boolField("displayShiftName", "Shift Name", { column: "DisplayShiftName" }),
  boolField("displayGroupName", "Group Name", { column: "DisplayGroupName" }),
  boolField("displayPullbackIcon", "Pullback Icon", {
    column: "DisplayPullbackIcon",
  }),
  boolField("displayOvertimeIcon", "Overtime Icon", {
    column: "DisplayOverTimeIcon",
  }),
  boolField(
    "displayAttendanceRegularizationIcon",
    "Attendance Regularization (AR) Icon",
    { column: "DisplayARIcon" },
  ),
  boolField(
    "displayPrecedenceRuleIcon",
    "Precedence Rule (Holiday/Weekly-Off) Icon",
    { column: "DisplayPrecendenceRuleWOHOIcon" },
  ),
  boolField("ShowWFHIconOnCalendar", "Work From Home (WFH) Icon"),
  boolField("ShowODIconOnCalendar", "On Duty (OD) Icon"),
  boolField("IsStrictSinglePunchRule", "Is Strict Single Punch Rule"),
  boolField("IsAbsenteeNotificationEnabled", "Absentee Notification Enabled"),
  selectField(
    "AbsenteeNotificationTriggerMethod",
    "Absentee Notification Trigger Method",
    [
      { label: "Consecutive Working Days", value: 0 },
      { label: "Cumulative Working Days", value: 1 },
    ],
    { enabledWhen: { key: "IsAbsenteeNotificationEnabled", value: true } },
  ),
  numberField(
    "AbsenteeNotificationThresholdDays",
    "Absentee Notification Threshold Days",
    {
      min: 1,
      max: 30,
      enabledWhen: { key: "IsAbsenteeNotificationEnabled", value: true },
    },
  ),
  numberField(
    "AbsenteeNotificationLookbackPeriod",
    "Absentee Notification Lookback Period",
    {
      min: 1,
      max: 30,
      enabledWhen: { key: "IsAbsenteeNotificationEnabled", value: true },
    },
  ),
  selectField("OTRequestMode", "OT Request Mode", [
    { label: "Cumulative", value: "C" },
    { label: "Breakdown", value: "B" },
  ]),

  selectField("HelpDeskRequestAssign", "Help Desk Request Assign", [
    { label: "User Defined", value: "User Defined" },
    { label: "System Defined", value: "System Defined" },
  ]),
  selectField(
    "MapHelpdeskActivityOwner",
    "Map Activity Owner to HelpDesk Request",
    [
      { label: "At Help Desk Group", value: "At Help Desk Group" },
      { label: "At Help Desk category", value: "At Help Desk category" },
      { label: "At Activity Name", value: "At Activity Name" },
    ],
  ),

  jsonField("TNEConfiguration", "Travel and Expense Configuration"),
  jsonField(
    "ExpensePartOneTNEConfiguration",
    "Web Expense Configuration(Part-1)",
  ),
  jsonField(
    "WebExpensePartTwoTNEConfiguration",
    "Web Expense Configuration(Part-2)",
  ),
  jsonField("WebOtherTNEConfiguration", "Web Expense Other Configuration"),
  jsonField("WebTravelTNEConfiguration", "Field Configuration - Travel"),
  textField("TravelDeskEmail", "Travel Desk Email", {
    table: TNE,
    column: "TravelDeskEmail",
  }),
  tneBool("IsMultipleWorkflow", "IsMultipleWorkflow", "Multiple Workflow"),
  numberField("TravelTypeId", "Travel Type Id", {
    table: TNE,
    column: "TravelTypeId",
  }),
  numberField("ItineraryOptionMaxLimit", "Itinerary Option Max Limit", {
    table: TNE,
    column: "ItineraryOptionMaxLimit",
  }),
  tneBool("IsCostEstimationEnable", "CostEstimationEnable", "Travel Cost Estimation"),
  tneBool("IsAdvanceEnabled", "AdvanceEnabled", "Associated Advance request"),
  tneBool("IsBillToOption", "BillToOption", "Show bill to pop up"),
  selectField(
    "DefaultBillToOption",
    'Default "Bill to" option',
    [
      { label: "NA", value: "NA" },
      { label: "Client", value: "Client" },
      { label: "Organization", value: "Organization" },
    ],
    {
      table: TNE,
      column: "DefaultBillToOption",
      enabledWhen: { key: "IsBillToOption", value: true },
    },
  ),
  tneBool("IsTravelReportEnabled", "TravelReportEnabled", "Travel report"),
  tneBool(
    "IsTravelReportSubmission",
    "TravelReportSubmission",
    "Show report submission",
  ),
  numberField(
    "TravelReportSubmissionDeadline",
    "Travel Report Submission Deadline (Days after travel end)",
    {
      table: TNE,
      column: "TravelReportSubmissionDeadline",
      enabledWhen: { key: "IsTravelReportSubmission", value: true },
    },
  ),
  selectField(
    "TravelRescheduleType",
    "Reschedule Type",
    [
      { label: "Date Change Only", value: "DateChangeOnly" },
      { label: "Full Edit Allowed", value: "FullEditAllowed" },
    ],
    { table: TNE, column: "TravelRescheduleType" },
  ),
  tneBool(
    "IsTravelRescheduleAddNewScheduleEnabled",
    "IsTravelRescheduleAddNewScheduleEnabled",
    "Add New Schedule/Accommodation",
    { enabledWhen: { key: "TravelRescheduleType", value: "FullEditAllowed" } },
  ),
  tneBool(
    "IsTravelRescheduleBookingPreferenceEnabled",
    "IsTravelRescheduleBookingPreferenceEnabled",
    "Booking Preference",
    { enabledWhen: { key: "TravelRescheduleType", value: "FullEditAllowed" } },
  ),
  selectField(
    "TravelRescheduleInitiatorRouting",
    "Rescheduled Requests Routing",
    [
      { label: "Send to Travel Desk", value: "TravelDesk" },
      {
        label: "Send to Reschedule Approval Workflow",
        value: "RescheduleApprovalWorkflow",
      },
    ],
    { table: TNE, column: "TravelRescheduleInitiatorRouting" },
  ),
  tneBool(
    "IsTNEExpensePurposeMandatory",
    "RequestPurposeMandatory",
    "Expense Request Purpose Mandatory",
  ),
  tneBool(
    "IsTNEExpenseApproverCommentMandatory",
    "ApproverCommentMandatory",
    "Expense Line Item Approver Comment Mandatory",
  ),
  tneBool(
    "IsTNEExpenseRejectCommentMandatory",
    "RejectCommentMandatory",
    "Expense Line Item Reject Comment Mandatory",
  ),
  tneBool(
    "IsTNESkipAcknowledgmentByAccountant",
    "SkipAcknowledgmentByAccountant",
    "Skip Accountant",
  ),
  tneBool("IsTNESkipAmountPaid", "SkipAmountPaid", "Skip Amount Paid", {
    enabledWhen: { key: "IsTNESkipAcknowledgmentByAccountant", value: true },
  }),
  numberField("ExpenseDateLimit", "Expense Cut-off Days", {
    table: TNE,
    column: "ExpenseDateLimit",
  }),
  tneBool(
    "IsExpenseCostCenterEnabled",
    "IsCostCenterEnabled",
    "Expense Cost Center",
  ),
  tneBool(
    "IsExpenseProjectDetailsEnabled",
    "isExpenseProjectDetailsEnabled",
    "Expense Project Details",
  ),
  selectField(
    "ExpenseProjectDetailsFormat",
    "Expense Project Details Format",
    [
      { label: "Name + Code + Region", value: "PCR" },
      { label: "Name + Code", value: "PC" },
      { label: "Name + Region", value: "PR" },
    ],
    {
      table: TNE,
      column: "ExpenseProjectDetailsFormat",
      enabledWhen: { key: "IsExpenseProjectDetailsEnabled", value: true },
    },
  ),
  tneBool(
    "CustomExpenseTypeEnabled",
    "CustomExpenseTypeEnabled",
    "Custom Expense Configuration",
  ),
  tneBool(
    "IsReapplyExpenseEnabled",
    "IsReapplyExpenseEnabled",
    "Expense Reapply for Rejected Line Items",
  ),
  numberField("MaxReapplyExpenseCount", "Maximum Reapply Count", {
    table: TNE,
    column: "MaxReapplyExpenseCount",
    enabledWhen: { key: "IsReapplyExpenseEnabled", value: true },
  }),

  jsonField("PreonboardingConfig", "Pre-Onboarding Configuration"),
  jsonField("UserConfiguration", "User Configuration", {
    description: "Used to render the modules on home screen of the user",
  }),
  textField("GoogleAPIKey", "Google API Key", { secret: true }),
  textField("GoToMeetingBasicToken", "GoTo Meeting Basic Token", {
    secret: true,
  }),
  textField("ZoomMeetingAccessToken", "Zoom Meeting Access Token", {
    secret: true,
  }),
  boolField("IsMMTintegrationEnabled", "MMT Integration"),
  boolField(
    "IsAdvanceUserCommentMandatory",
    "Advance User Comment Mandatory",
  ),
  boolField(
    "IsAdvanceApproverCommentMandatory",
    "Approve Request Comment Mandatory",
  ),
  boolField(
    "IsAdvanceRejectCommentMandatory",
    "Reject Request Comment Mandatory",
  ),
  numberField("RetirementAge", "Retirement Age", { min: 40, max: 80 }),
  numberField("RetirementAlertBeforeDays", "Alert Window (Days)", {
    min: 1,
    max: 365,
  }),
];

export const CUSTOMER_SETTING_FIELD_BY_KEY: Record<string, CustomerSettingField> =
  Object.fromEntries(CUSTOMER_SETTING_FIELDS.map((field) => [field.key, field]));

export const CUSTOMER_SETTING_CATEGORIES: CustomerSettingCategory[] = [
  {
    id: "auth",
    label: "Auth Settings",
    keys: [
      "IsOffice365LoginEnabled",
      "AzureSubscriptionKey",
      "AzureApplicationClientId",
      "AzureApplicationTenantId",
      "AzureApplicationClientSecret",
      "IsEmailLoginEnabled",
      "IsCloudOrOnPremises",
      "IsExternalLogin",
      "ExternalLogin_AppId",
      "ExternalLogin_Authority",
      "ExternalLoginDomains",
      "IsShowPolicyConsent",
      "IsForgotPasswordEnabled",
    ],
  },
  {
    id: "employeeManagement",
    label: "Employee Management Settings",
    keys: [
      "IsStateMandatoryMyDetails",
      "IsEmployeeProfileChange",
      "AllowChangingEmploymentNumber",
      "IsPassportVisaMandatory",
      "IsGradeEnable",
      "IsIncludeMiddleName",
      "IsCostCenterEnabled",
      "IsEnableAutoWelcomeEmail",
      "SendRetirementAgeNotfication",
      "IsMultiplePayrollAllowed",
    ],
  },
  {
    id: "master",
    label: "Master Settings",
    keys: ["IsLevelMandatoryDesignation", "BusinessUnit"],
  },
  {
    id: "externalPayroll",
    label: "External Payroll Settings",
    keys: ["isEnabled", "providerName", "baseUrl"],
  },
  {
    id: "feature",
    label: "Feature Settings",
    keys: [
      "ShowChatModule",
      "IsShowFeedback",
      "IsShowAttendanceMode",
      "IsShowManagementDashboard",
      "AttendanceModeIconVisible",
      "MaxAttemptsToSendFrgPwdEmail",
      "AllowPartialWorkflow",
    ],
  },
  {
    id: "lms",
    label: "LMS Settings",
    keys: [
      "IsShowPostAssessment",
      "IsMSTeamEnabled",
      "IsWhatsAppEnabled",
      "IsShowTrainingSubCategory",
      "IsGenerateQRCode",
      "IsScreenshotEnable",
      "TrainingCertificateDocument",
      "TrainerCertificateDocument",
      "RatingTypeId",
      "RatingValue",
    ],
  },
  {
    id: "recruitment",
    label: "Recruitment Settings",
    keys: [
      "IsDonorDetails",
      "IsAddAdditionalCcInOfferLetter",
      "IsRRSApprovedFromHiringManager",
      "IsOLForCandidatePasswordProtected",
      "IsViewCTCPermissions",
      "IsUseBudgetApproval",
      "IsAutoRRSCreationOnResignation",
      "IsRevisedHiring",
      "IsRevisedOffer",
      "IsUseRecruitmentPermission",
      "IsEnabledWorkforceSummaryTable",
      "NumberOfOnHoldRemindersBeforeExpiry",
      "OnHoldActionReminders",
    ],
  },
  {
    id: "la",
    label: "L&A Settings",
    keys: [
      "IsShowShiftRoaster",
      "UseEmployeeDefaultShiftIfRosterNotAssigned",
      "IsPendingLeavesIncludeInPayableDays",
      "ShowGeoTrackingReportonMap",
      "ReportFilterOn",
      "AttendanceAdjustmentCriteria",
      "AttendanceAdjustmentHoursMode",
      "ShiftOnEarlyShiftStartTime",
      "ConsiderPunchesWithinShiftBracket",
      "LeaveAttendanceRiskPolicySettings",
      "ShowCheckInOutForAutoPresent",
      "EnableOpeningBalanceAdjustment",
      "weeklySummaryCalculationScope",
      "calendarViewMode",
      "weeklyOffMonthlySummaryCalculationScope",
      "holidayMonthlySummaryCalculationScope",
      "leaveMonthlySummaryCalculationScope",
      "RotationalRoster",
      "IsShowHalfDayWeeklyOffInRoaster",
      "IsShowHalfDayHolidayInRoaster",
      "AllowLeaveIfPresent",
      "UnfreezePolicy",
      "IsLeaveLapseNotificationApplicable",
      "displayLogInOutDeviceIcons",
      "displayShiftName",
      "displayGroupName",
      "displayPullbackIcon",
      "displayOvertimeIcon",
      "displayAttendanceRegularizationIcon",
      "displayPrecedenceRuleIcon",
      "ShowWFHIconOnCalendar",
      "ShowODIconOnCalendar",
      "IsStrictSinglePunchRule",
      "IsAbsenteeNotificationEnabled",
      "AbsenteeNotificationTriggerMethod",
      "AbsenteeNotificationThresholdDays",
      "AbsenteeNotificationLookbackPeriod",
      "OTRequestMode",
    ],
    groups: [
      {
        label: "Generic Settings",
        keys: [
          "IsShowShiftRoaster",
          "UseEmployeeDefaultShiftIfRosterNotAssigned",
          "IsPendingLeavesIncludeInPayableDays",
          "ShowGeoTrackingReportonMap",
          "ReportFilterOn",
          "AttendanceAdjustmentCriteria",
          "AttendanceAdjustmentHoursMode",
          "ShiftOnEarlyShiftStartTime",
          "ConsiderPunchesWithinShiftBracket",
          "ShowCheckInOutForAutoPresent",
          "EnableOpeningBalanceAdjustment",
          "RotationalRoster",
          "IsShowHalfDayWeeklyOffInRoaster",
          "IsShowHalfDayHolidayInRoaster",
          "AllowLeaveIfPresent",
          "UnfreezePolicy",
          "IsLeaveLapseNotificationApplicable",
          "IsStrictSinglePunchRule",
          "IsAbsenteeNotificationEnabled",
          "AbsenteeNotificationTriggerMethod",
          "AbsenteeNotificationThresholdDays",
          "AbsenteeNotificationLookbackPeriod",
          "OTRequestMode",
        ],
      },
      {
        label: "L&A Risk Policy Settings",
        keys: ["LeaveAttendanceRiskPolicySettings"],
      },
      {
        label: "Attendance Card Settings",
        keys: [
          "weeklySummaryCalculationScope",
          "calendarViewMode",
          "weeklyOffMonthlySummaryCalculationScope",
          "holidayMonthlySummaryCalculationScope",
          "leaveMonthlySummaryCalculationScope",
          "displayLogInOutDeviceIcons",
          "displayShiftName",
          "displayGroupName",
          "displayPullbackIcon",
          "displayOvertimeIcon",
          "displayAttendanceRegularizationIcon",
          "displayPrecedenceRuleIcon",
          "ShowWFHIconOnCalendar",
          "ShowODIconOnCalendar",
        ],
      },
    ],
  },
  {
    id: "ess",
    label: "ESS Settings",
    keys: ["HelpDeskRequestAssign", "MapHelpdeskActivityOwner"],
  },
  {
    id: "te",
    label: "T&E Settings",
    keys: [
      "TNEConfiguration",
      "ExpensePartOneTNEConfiguration",
      "WebExpensePartTwoTNEConfiguration",
      "WebOtherTNEConfiguration",
      "WebTravelTNEConfiguration",
      "TravelDeskEmail",
      "IsMultipleWorkflow",
      "TravelTypeId",
      "ItineraryOptionMaxLimit",
      "IsCostEstimationEnable",
      "IsAdvanceEnabled",
      "IsBillToOption",
      "DefaultBillToOption",
      "IsTravelReportEnabled",
      "IsTravelReportSubmission",
      "TravelReportSubmissionDeadline",
      "TravelRescheduleType",
      "IsTravelRescheduleAddNewScheduleEnabled",
      "IsTravelRescheduleBookingPreferenceEnabled",
      "TravelRescheduleInitiatorRouting",
      "IsTNEExpensePurposeMandatory",
      "IsTNEExpenseApproverCommentMandatory",
      "IsTNEExpenseRejectCommentMandatory",
      "IsTNESkipAcknowledgmentByAccountant",
      "IsTNESkipAmountPaid",
      "ExpenseDateLimit",
      "IsExpenseCostCenterEnabled",
      "IsExpenseProjectDetailsEnabled",
      "ExpenseProjectDetailsFormat",
      "CustomExpenseTypeEnabled",
      "IsReapplyExpenseEnabled",
      "MaxReapplyExpenseCount",
    ],
    groups: [
      {
        label: "General Settings",
        keys: [
          "TNEConfiguration",
          "ExpensePartOneTNEConfiguration",
          "WebExpensePartTwoTNEConfiguration",
          "WebOtherTNEConfiguration",
        ],
      },
      {
        label: "Travel Settings",
        keys: [
          "TravelDeskEmail",
          "IsMultipleWorkflow",
          "TravelTypeId",
          "ItineraryOptionMaxLimit",
          "IsCostEstimationEnable",
          "IsAdvanceEnabled",
          "IsBillToOption",
          "DefaultBillToOption",
          "IsTravelReportEnabled",
          "IsTravelReportSubmission",
          "TravelReportSubmissionDeadline",
          "TravelRescheduleType",
          "IsTravelRescheduleAddNewScheduleEnabled",
          "IsTravelRescheduleBookingPreferenceEnabled",
          "TravelRescheduleInitiatorRouting",
        ],
      },
      {
        label: "Expense Settings",
        keys: [
          "IsTNEExpensePurposeMandatory",
          "IsTNEExpenseApproverCommentMandatory",
          "IsTNEExpenseRejectCommentMandatory",
          "IsTNESkipAcknowledgmentByAccountant",
          "IsTNESkipAmountPaid",
          "ExpenseDateLimit",
          "IsExpenseCostCenterEnabled",
          "IsExpenseProjectDetailsEnabled",
          "ExpenseProjectDetailsFormat",
          "CustomExpenseTypeEnabled",
          "IsReapplyExpenseEnabled",
          "MaxReapplyExpenseCount",
        ],
      },
      {
        label: "Field Configuration - Travel",
        keys: ["WebTravelTNEConfiguration"],
      },
    ],
  },
  {
    id: "preonboarding",
    label: "Pre-Onboarding Settings",
    keys: ["PreonboardingConfig"],
  },
  {
    id: "mobile",
    label: "Mobile Settings",
    keys: ["UserConfiguration", "GoogleAPIKey"],
  },
  {
    id: "thirdParty",
    label: "Third Party App Settings",
    keys: [
      "GoToMeetingBasicToken",
      "ZoomMeetingAccessToken",
      "IsMMTintegrationEnabled",
    ],
  },
  {
    id: "advance",
    label: "Advance Settings",
    keys: [
      "IsAdvanceUserCommentMandatory",
      "IsAdvanceApproverCommentMandatory",
      "IsAdvanceRejectCommentMandatory",
    ],
  },
  {
    id: "retirement",
    label: "Retirement Settings",
    keys: ["RetirementAge", "RetirementAlertBeforeDays"],
  },
];

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isCustomerSettingCategoryId(
  value: string,
): value is CustomerSettingCategoryId {
  return (CUSTOMER_SETTING_CATEGORY_IDS as readonly string[]).includes(value);
}

export function getCustomerSettingCategory(
  id: CustomerSettingCategoryId,
): CustomerSettingCategory {
  const category = CUSTOMER_SETTING_CATEGORIES.find((item) => item.id === id);
  if (!category) {
    throw new Error(`Unknown customer settings category ${id}.`);
  }
  return category;
}

export function requireSettingField(key: string): CustomerSettingField {
  const field = CUSTOMER_SETTING_FIELD_BY_KEY[key];
  if (!field) {
    throw new Error(`Unknown customer setting ${key}.`);
  }
  if (!SQL_IDENT.test(field.column)) {
    throw new Error(`Refusing to use identifier ${field.column}.`);
  }
  return field;
}

export function fieldsForCategory(
  id: CustomerSettingCategoryId,
): CustomerSettingField[] {
  return getCustomerSettingCategory(id).keys.map(requireSettingField);
}

export function asSettingBool(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "Y" ||
    value === "true" ||
    value === "True"
  );
}

export function decodeSettingValue(
  field: CustomerSettingField,
  raw: unknown,
): CustomerSettingUiValue {
  if (raw == null) {
    return null;
  }
  if (field.type === "bool") {
    if (field.encoding === "yn") {
      if (raw === "" ) {
        return null;
      }
      return asSettingBool(raw);
    }
    return asSettingBool(raw);
  }
  if (field.type === "number") {
    if (raw === "" ) {
      return null;
    }
    const parsed = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (field.type === "json") {
    if (typeof raw === "string") {
      return raw;
    }
    return JSON.stringify(raw);
  }
  if (field.type === "select") {
    if (typeof raw === "boolean") {
      return raw ? "1" : "0";
    }
    if (typeof raw === "number" || typeof raw === "string") {
      return raw;
    }
    return String(raw);
  }
  return String(raw);
}

export function encodeSettingValue(
  field: CustomerSettingField,
  value: CustomerSettingUiValue,
): string | number | boolean | null {
  if (field.type === "json") {
    return compactJsonSetting(value);
  }
  if (value == null || value === "") {
    return null;
  }
  if (field.type === "bool") {
    const flag = asSettingBool(value);
    if (field.encoding === "yn") {
      return flag ? "Y" : "N";
    }
    return flag ? 1 : 0;
  }
  if (field.type === "number") {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${field.label} must be a number.`);
    }
    if (field.min != null && parsed < field.min) {
      throw new Error(`${field.label} must be at least ${field.min}.`);
    }
    if (field.max != null && parsed > field.max) {
      throw new Error(`${field.label} must be at most ${field.max}.`);
    }
    return parsed;
  }
  return String(value);
}

export function compactJsonSetting(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return JSON.stringify(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON.";
    throw new Error(`JSON is invalid: ${message}`);
  }
}

export function settingValuesEqual(
  left: CustomerSettingUiValue,
  right: CustomerSettingUiValue,
): boolean {
  if (left == null && right == null) {
    return true;
  }
  if (left == null || right == null) {
    return false;
  }
  if (typeof left === "boolean" || typeof right === "boolean") {
    return asSettingBool(left) === asSettingBool(right);
  }
  if (typeof left === "number" || typeof right === "number") {
    return Number(left) === Number(right);
  }
  return String(left) === String(right);
}

export function diffCustomerSettingPatch(
  current: Record<string, CustomerSettingUiValue>,
  patch: Record<string, CustomerSettingUiValue>,
): Array<{ Key: string; Label: string; Current: string; Proposed: string }> {
  const rows: Array<{
    Key: string;
    Label: string;
    Current: string;
    Proposed: string;
  }> = [];
  for (const [key, proposed] of Object.entries(patch)) {
    const field = requireSettingField(key);
    const before = current[key] ?? null;
    if (settingValuesEqual(before, proposed)) {
      continue;
    }
    rows.push({
      Key: key,
      Label: field.label,
      Current: formatPreviewValue(field, before),
      Proposed: formatPreviewValue(field, proposed),
    });
  }
  return rows;
}

export function formatPreviewValue(
  field: CustomerSettingField,
  value: CustomerSettingUiValue,
): string {
  if (value == null || value === "") {
    return "—";
  }
  if (field.type === "json") {
    const text = String(value);
    return text.length > 240 ? `${text.slice(0, 240)}…` : text;
  }
  if (field.type === "bool") {
    const flag = asSettingBool(value);
    if (field.trueLabel && field.falseLabel) {
      return flag ? field.trueLabel : field.falseLabel;
    }
    return flag ? "Yes" : "No";
  }
  if (field.secret) {
    return "••••••••";
  }
  if (field.options) {
    const match = field.options.find(
      (option) => String(option.value) === String(value),
    );
    return match?.label ?? String(value);
  }
  return String(value);
}

export function parseCategoryPatch(
  categoryId: CustomerSettingCategoryId,
  patch: Record<string, unknown>,
): Record<string, CustomerSettingUiValue> {
  const allowed = new Set(getCustomerSettingCategory(categoryId).keys);
  const parsed: Record<string, CustomerSettingUiValue> = {};
  for (const [key, raw] of Object.entries(patch)) {
    if (!allowed.has(key)) {
      throw new Error(`${key} is not part of ${categoryId} settings.`);
    }
    const field = requireSettingField(key);
    if (raw == null) {
      parsed[key] = null;
      continue;
    }
    if (field.type === "json") {
      parsed[key] = compactJsonSetting(raw);
      continue;
    }
    if (field.type === "bool") {
      parsed[key] = asSettingBool(raw);
      continue;
    }
    if (field.type === "number") {
      if (raw === "") {
        parsed[key] = null;
        continue;
      }
      const parsedNumber = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(parsedNumber)) {
        throw new Error(`${field.label} must be a number.`);
      }
      parsed[key] = parsedNumber;
      continue;
    }
    parsed[key] = String(raw);
  }
  return parsed;
}

export type MissingCustomerSettingColumn = {
  key: string;
  label: string;
  table: CustomerSettingTable;
  column: string;
};

export type CustomerSettingColumnSplit = {
  presentFields: CustomerSettingField[];
  missingColumns: MissingCustomerSettingColumn[];
  includeTneJoin: boolean;
  includePayrollJoin: boolean;
};

export function splitCustomerSettingColumns(
  presentTableNames: ReadonlySet<string>,
  presentColumnKeys: ReadonlySet<string>,
): CustomerSettingColumnSplit {
  const tables = new Set([...presentTableNames].map((name) => name.toLowerCase()));
  const columns = new Set([...presentColumnKeys].map((key) => key.toLowerCase()));
  const presentFields: CustomerSettingField[] = [];
  const missingColumns: MissingCustomerSettingColumn[] = [];
  for (const field of CUSTOMER_SETTING_FIELDS) {
    const tablePresent = tables.has(field.table.toLowerCase());
    const columnPresent = columns.has(
      `${field.table}.${field.column}`.toLowerCase(),
    );
    if (tablePresent && columnPresent) {
      presentFields.push(field);
    } else {
      missingColumns.push({
        key: field.key,
        label: field.label,
        table: field.table,
        column: field.column,
      });
    }
  }
  return {
    presentFields,
    missingColumns,
    includeTneJoin: tables.has("ttneemployerconfiguration"),
    includePayrollJoin: tables.has("texternal_payroll_configuration"),
  };
}
