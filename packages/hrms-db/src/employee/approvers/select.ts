export type ApproverScope =
  | "location-and-business-unit"
  | "business-unit"
  | "location"
  | "unscoped"
  | "default";

export const APPROVER_SCOPE_LABEL: Record<ApproverScope, string> = {
  "location-and-business-unit": "Location and business unit",
  "business-unit": "Business unit",
  location: "Location",
  unscoped: "Unscoped",
  default: "Default",
};

export const NO_WORKFLOW_APPLIES = "No workflow applies";

export type ApproverPerson = {
  employeeId: number;
  name: string;
  employmentNumber: string | null;
};

export type ApproverWorkflow = {
  workflowId: number;
  workflowName: string;
  isDefault: boolean;
  isPartial: boolean;
  skipWorkFlow: boolean;
  autoApproved: boolean;
  notificationOnly: boolean;
  pageIds: number[];
  locationIds: number[];
  businessUnitIds: number[];
};

export type ApproverPage = {
  pageId: number;
  pageName: string;
  moduleName: string;
};

export type ApproverDetail = {
  workflowId: number;
  managerId: number;
  roleCode: string;
  level: number;
};

export type ApproverRoleKind =
  | "functional-manager"
  | "reporting-manager"
  | "business-unit-heads"
  | "workflow-group"
  | "initiator"
  | "recruitment-admin"
  | "depends-on-request";

export type ApplicableWorkflow = {
  pageId: number;
  workflow: ApproverWorkflow;
  scope: ApproverScope;
};

export type ApplicableWorkflowSelection = {
  matches: ApplicableWorkflow[];
  unmatchedPageIds: number[];
};

export type EmployeeApproverRow = {
  rowKey: string;
  moduleName: string;
  pageName: string;
  workflowId: number | null;
  workflowName: string | null;
  scopeLabel: string;
  skipWorkFlow: boolean;
  autoApproved: boolean;
  notificationOnly: boolean;
  level: number | null;
  roleName: string | null;
  people: ApproverPerson[];
  note: string | null;
};

export type WorkflowGroupApprovers = {
  roleName: string;
  people: ApproverPerson[];
};

const ROLE_LABELS: Record<string, string> = {
  F: "Functional Authority",
  R: "Reporting Authority",
  I: "Initiator",
  A: "Activity Owner",
  H: "Hiring Manager",
  C: "Candidate",
  D: "Recruiter",
  B: "RecruitmentAdmin",
  M: "Business Unit Head",
  PF: "Previous Level Functional Authority",
  PR: "Previous Level Reporting Authority",
};

const REQUEST_SPECIFIC_NOTES: Record<string, string> = {
  A: "Filled from the activity on the request.",
  H: "Filled from the recruitment request.",
  C: "Filled from the candidate on the request.",
  D: "Filled from the candidate and recruitment request.",
};

const FUNCTIONAL_MISSING = "Functional manager is not assigned.";
const REPORTING_MISSING = "Reporting manager is not assigned.";
const BUSINESS_UNIT_MISSING = "This employee has no business unit.";
const BUSINESS_UNIT_HEAD_MISSING = "No active business unit head is assigned.";
const RECRUITMENT_ADMIN_MISSING = "No active Recruitment Admin user was found.";
const GROUP_MISSING = "Workflow group was not found.";
const PREVIOUS_LEVEL_NOTE = "Filled from the previous approver.";
const NO_APPROVERS = "No approvers are defined.";
const NOTIFICATION_ONLY_NOTE = "Nobody approves this workflow.";

export function workflowIsRoutable(
  isPartial: boolean,
  allowPartialWorkflow: unknown,
): boolean {
  if (!isPartial) {
    return true;
  }
  if (allowPartialWorkflow == null) {
    return false;
  }
  return (
    allowPartialWorkflow === false ||
    allowPartialWorkflow === 0 ||
    allowPartialWorkflow === "0" ||
    allowPartialWorkflow === "false"
  );
}

export function classifyApproverRole(
  roleCode: string,
  level: number,
): { kind: ApproverRoleKind; note: string | null } {
  const code = roleCode.trim().toUpperCase();
  if (code === "F" || (code === "PF" && level <= 1)) {
    return { kind: "functional-manager", note: null };
  }
  if (code === "R" || (code === "PR" && level <= 1)) {
    return { kind: "reporting-manager", note: null };
  }
  if (code === "PF" || code === "PR") {
    return { kind: "depends-on-request", note: PREVIOUS_LEVEL_NOTE };
  }
  if (code === "M") {
    return { kind: "business-unit-heads", note: null };
  }
  if (code === "U") {
    return { kind: "workflow-group", note: null };
  }
  if (code === "I") {
    return { kind: "initiator", note: null };
  }
  if (code === "B") {
    return { kind: "recruitment-admin", note: null };
  }
  return {
    kind: "depends-on-request",
    note: REQUEST_SPECIFIC_NOTES[code] ?? "This role is resolved from the request.",
  };
}

export function selectApplicableWorkflows(input: {
  workflows: ApproverWorkflow[];
  locationId: number | null;
  businessUnitId: number | null;
  allowPartialWorkflow: unknown;
}): ApplicableWorkflowSelection {
  const included = input.workflows.filter((workflow) =>
    workflowIsRoutable(workflow.isPartial, input.allowPartialWorkflow),
  );
  const byPage = new Map<number, ApproverWorkflow[]>();
  for (const workflow of included) {
    for (const pageId of uniquePositive(workflow.pageIds)) {
      const list = byPage.get(pageId) ?? [];
      list.push(workflow);
      byPage.set(pageId, list);
    }
  }

  const matches: ApplicableWorkflow[] = [];
  const unmatchedPageIds: number[] = [];
  for (const pageId of [...byPage.keys()].sort((left, right) => left - right)) {
    const pageWorkflows = byPage.get(pageId) ?? [];
    const custom = pageWorkflows.filter((workflow) => !workflow.isDefault);
    if (custom.length > 0) {
      const scoped = custom.flatMap((workflow) => {
        const scope = matchingScope(workflow, input.locationId, input.businessUnitId);
        return scope ? [{ pageId, workflow, scope }] : [];
      });
      if (scoped.length > 0) {
        matches.push(...scoped);
        continue;
      }
      const unscoped = custom
        .filter(
          (workflow) =>
            workflow.locationIds.length === 0 && workflow.businessUnitIds.length === 0,
        )
        .map((workflow) => ({
          pageId,
          workflow,
          scope: "unscoped" as const,
        }));
      if (unscoped.length === 0) {
        unmatchedPageIds.push(pageId);
      } else {
        matches.push(...unscoped);
      }
      continue;
    }
    matches.push(
      ...pageWorkflows
        .filter((workflow) => workflow.isDefault)
        .map((workflow) => ({
          pageId,
          workflow,
          scope: "default" as const,
        })),
    );
  }
  return { matches, unmatchedPageIds };
}

export function assembleEmployeeApproverRows(input: {
  pages: ApproverPage[];
  details: ApproverDetail[];
  selection: ApplicableWorkflowSelection;
  groups: Map<number, WorkflowGroupApprovers>;
  businessUnitHeads: ApproverPerson[];
  recruitmentAdmins: ApproverPerson[];
  functionalManager: ApproverPerson | null;
  reportingManager: ApproverPerson | null;
  initiator: ApproverPerson;
  hasBusinessUnit: boolean;
}): EmployeeApproverRow[] {
  const pages = new Map(input.pages.map((page) => [page.pageId, page]));
  const detailsByWorkflow = new Map<number, ApproverDetail[]>();
  for (const detail of input.details) {
    const list = detailsByWorkflow.get(detail.workflowId) ?? [];
    list.push(detail);
    detailsByWorkflow.set(detail.workflowId, list);
  }

  const rows: EmployeeApproverRow[] = [];
  for (const match of input.selection.matches) {
    const page = pages.get(match.pageId);
    const details = (detailsByWorkflow.get(match.workflow.workflowId) ?? [])
      .slice()
      .sort((left, right) => left.level - right.level || left.managerId - right.managerId);
    if (details.length === 0) {
      rows.push(
        workflowRow(match, page, {
          level: null,
          roleName: null,
          people: [],
          note: match.workflow.notificationOnly ? NOTIFICATION_ONLY_NOTE : NO_APPROVERS,
          suffix: "empty",
        }),
      );
      continue;
    }
    details.forEach((detail, index) => {
      const resolved = resolveDetail(detail, input);
      rows.push(
        workflowRow(match, page, {
          level: detail.level,
          roleName: resolved.roleName,
          people: resolved.people,
          note: resolved.note,
          suffix: `${detail.level}:${detail.roleCode}:${detail.managerId}:${index}`,
        }),
      );
    });
  }

  for (const pageId of input.selection.unmatchedPageIds) {
    const page = pages.get(pageId);
    rows.push({
      rowKey: `${pageId}:none`,
      moduleName: page?.moduleName ?? "—",
      pageName: page?.pageName ?? `Page ${pageId}`,
      workflowId: null,
      workflowName: null,
      scopeLabel: NO_WORKFLOW_APPLIES,
      skipWorkFlow: false,
      autoApproved: false,
      notificationOnly: false,
      level: null,
      roleName: null,
      people: [],
      note: null,
    });
  }

  rows.sort(compareRows);
  return rows;
}

function resolveDetail(
  detail: ApproverDetail,
  input: {
    groups: Map<number, WorkflowGroupApprovers>;
    businessUnitHeads: ApproverPerson[];
    recruitmentAdmins: ApproverPerson[];
    functionalManager: ApproverPerson | null;
    reportingManager: ApproverPerson | null;
    initiator: ApproverPerson;
    hasBusinessUnit: boolean;
  },
): { roleName: string; people: ApproverPerson[]; note: string | null } {
  const classified = classifyApproverRole(detail.roleCode, detail.level);
  const roleName = roleLabel(detail, input.groups);
  if (classified.kind === "depends-on-request") {
    return { roleName, people: [], note: classified.note };
  }
  if (classified.kind === "functional-manager") {
    return {
      roleName,
      people: input.functionalManager ? [input.functionalManager] : [],
      note: input.functionalManager ? null : FUNCTIONAL_MISSING,
    };
  }
  if (classified.kind === "reporting-manager") {
    return {
      roleName,
      people: input.reportingManager ? [input.reportingManager] : [],
      note: input.reportingManager ? null : REPORTING_MISSING,
    };
  }
  if (classified.kind === "initiator") {
    return { roleName, people: [input.initiator], note: null };
  }
  if (classified.kind === "recruitment-admin") {
    return {
      roleName,
      people: input.recruitmentAdmins,
      note: input.recruitmentAdmins.length > 0 ? null : RECRUITMENT_ADMIN_MISSING,
    };
  }
  if (classified.kind === "business-unit-heads") {
    if (!input.hasBusinessUnit) {
      return { roleName, people: [], note: BUSINESS_UNIT_MISSING };
    }
    return {
      roleName,
      people: input.businessUnitHeads,
      note: input.businessUnitHeads.length > 0 ? null : BUSINESS_UNIT_HEAD_MISSING,
    };
  }
  if (detail.managerId <= 0) {
    return { roleName, people: [], note: GROUP_MISSING };
  }
  const group = input.groups.get(detail.managerId);
  const people = group?.people ?? [];
  return {
    roleName: group?.roleName?.trim() || roleName,
    people,
    note:
      people.length > 0
        ? null
        : `No member of ${group?.roleName?.trim() || roleName} covers this employee's location and business unit.`,
  };
}

function roleLabel(
  detail: ApproverDetail,
  groups: Map<number, WorkflowGroupApprovers>,
): string {
  const code = detail.roleCode.trim().toUpperCase();
  if (code === "U") {
    return groups.get(detail.managerId)?.roleName?.trim() || "Workflow group";
  }
  return ROLE_LABELS[code] ?? detail.roleCode.trim();
}

function workflowRow(
  match: ApplicableWorkflow,
  page: ApproverPage | undefined,
  resolved: {
    level: number | null;
    roleName: string | null;
    people: ApproverPerson[];
    note: string | null;
    suffix: string;
  },
): EmployeeApproverRow {
  return {
    rowKey: `${match.pageId}:${match.workflow.workflowId}:${resolved.suffix}`,
    moduleName: page?.moduleName ?? "—",
    pageName: page?.pageName ?? `Page ${match.pageId}`,
    workflowId: match.workflow.workflowId,
    workflowName: match.workflow.workflowName,
    scopeLabel: APPROVER_SCOPE_LABEL[match.scope],
    skipWorkFlow: match.workflow.skipWorkFlow,
    autoApproved: match.workflow.autoApproved,
    notificationOnly: match.workflow.notificationOnly,
    level: resolved.level,
    roleName: resolved.roleName,
    people: resolved.people,
    note: resolved.note,
  };
}

function matchingScope(
  workflow: ApproverWorkflow,
  locationId: number | null,
  businessUnitId: number | null,
): ApproverScope | null {
  const hasLocations = workflow.locationIds.length > 0;
  const hasBusinessUnits = workflow.businessUnitIds.length > 0;
  const locationMatch =
    locationId != null && locationId > 0 && workflow.locationIds.includes(locationId);
  const businessUnitMatch =
    businessUnitId != null &&
    businessUnitId > 0 &&
    workflow.businessUnitIds.includes(businessUnitId);
  if (hasLocations && hasBusinessUnits && locationMatch && businessUnitMatch) {
    return "location-and-business-unit";
  }
  if (!hasLocations && hasBusinessUnits && businessUnitMatch) {
    return "business-unit";
  }
  if (hasLocations && !hasBusinessUnits && locationMatch) {
    return "location";
  }
  return null;
}

function compareRows(left: EmployeeApproverRow, right: EmployeeApproverRow): number {
  return (
    compareText(left.moduleName, right.moduleName) ||
    compareText(left.pageName, right.pageName) ||
    compareText(left.workflowName ?? "", right.workflowName ?? "") ||
    (left.level ?? 0) - (right.level ?? 0) ||
    compareText(left.roleName ?? "", right.roleName ?? "")
  );
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function uniquePositive(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}
