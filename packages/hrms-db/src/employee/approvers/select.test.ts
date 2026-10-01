import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assembleEmployeeApproverRows,
  classifyApproverRole,
  selectApplicableWorkflows,
  type ApproverWorkflow,
} from "./select.ts";

function workflow(
  input: Partial<ApproverWorkflow> & Pick<ApproverWorkflow, "workflowId" | "pageIds">,
): ApproverWorkflow {
  return {
    workflowName: `Workflow ${input.workflowId}`,
    isDefault: false,
    isPartial: false,
    skipWorkFlow: false,
    autoApproved: false,
    notificationOnly: false,
    locationIds: [],
    businessUnitIds: [],
    ...input,
  };
}

const employee = { locationId: 10, businessUnitId: 20 };

describe("selectApplicableWorkflows", () => {
  it("prefers a location and business unit match over an unscoped custom workflow", () => {
    const selection = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: 0,
      workflows: [
        workflow({
          workflowId: 1,
          pageIds: [7],
          locationIds: [10],
          businessUnitIds: [20],
        }),
        workflow({ workflowId: 2, pageIds: [7] }),
        workflow({ workflowId: 3, pageIds: [7], isDefault: true }),
      ],
    });
    assert.deepEqual(
      selection.matches.map((match) => [match.workflow.workflowId, match.scope]),
      [[1, "location-and-business-unit"]],
    );
    assert.deepEqual(selection.unmatchedPageIds, []);
  });

  it("uses an unscoped custom workflow when no scoped workflow covers the employee", () => {
    const selection = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: false,
      workflows: [
        workflow({
          workflowId: 1,
          pageIds: [7],
          locationIds: [99],
          businessUnitIds: [20],
        }),
        workflow({ workflowId: 2, pageIds: [7] }),
        workflow({ workflowId: 3, pageIds: [7], isDefault: true }),
      ],
    });
    assert.deepEqual(
      selection.matches.map((match) => match.workflow.workflowId),
      [2],
    );
    assert.equal(selection.matches[0]?.scope, "unscoped");
  });

  it("uses default workflows only when the page has no custom workflow", () => {
    const selection = selectApplicableWorkflows({
      locationId: null,
      businessUnitId: null,
      allowPartialWorkflow: 1,
      workflows: [
        workflow({ workflowId: 4, pageIds: [7], isDefault: true, locationIds: [1] }),
        workflow({ workflowId: 5, pageIds: [7], isDefault: true }),
      ],
    });
    assert.deepEqual(
      selection.matches.map((match) => match.workflow.workflowId),
      [4, 5],
    );
    assert.equal(selection.matches[0]?.scope, "default");
  });

  it("matches business unit only and location only on their own", () => {
    const selection = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: 0,
      workflows: [
        workflow({ workflowId: 1, pageIds: [1], businessUnitIds: [20] }),
        workflow({ workflowId: 2, pageIds: [2], locationIds: [10] }),
      ],
    });
    assert.deepEqual(
      selection.matches.map((match) => [match.pageId, match.scope]),
      [
        [1, "business-unit"],
        [2, "location"],
      ],
    );
  });

  it("falls back to the default when the only custom workflow is excluded as partial", () => {
    const selection = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: 1,
      workflows: [
        workflow({ workflowId: 8, pageIds: [3], isPartial: true, locationIds: [10], businessUnitIds: [20] }),
        workflow({ workflowId: 9, pageIds: [3], isDefault: true }),
      ],
    });
    assert.deepEqual(
      selection.matches.map((match) => [match.workflow.workflowId, match.scope]),
      [[9, "default"]],
    );
  });

  it("includes partial workflows only when partial workflows are allowed to route", () => {
    const partial = workflow({ workflowId: 8, pageIds: [3], isPartial: true });
    const excluded = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: 1,
      workflows: [partial],
    });
    assert.deepEqual(excluded.matches, []);
    assert.deepEqual(excluded.unmatchedPageIds, []);

    const included = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: 0,
      workflows: [partial],
    });
    assert.equal(included.matches[0]?.workflow.workflowId, 8);

    const missingSetting = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: null,
      workflows: [partial],
    });
    assert.deepEqual(missingSetting.matches, []);
  });

  it("reports a page when enabled workflows do not cover the employee", () => {
    const selection = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: 0,
      workflows: [
        workflow({
          workflowId: 9,
          pageIds: [4],
          locationIds: [99],
          businessUnitIds: [88],
        }),
      ],
    });
    assert.deepEqual(selection.matches, []);
    assert.deepEqual(selection.unmatchedPageIds, [4]);
  });

  it("returns nothing when there are no workflows", () => {
    assert.deepEqual(
      selectApplicableWorkflows({
        workflows: [],
        locationId: 1,
        businessUnitId: 2,
        allowPartialWorkflow: 0,
      }),
      { matches: [], unmatchedPageIds: [] },
    );
  });
});

describe("classifyApproverRole", () => {
  it("resolves org, group, initiator, and recruitment admin roles", () => {
    assert.equal(classifyApproverRole("F", 2).kind, "functional-manager");
    assert.equal(classifyApproverRole("R", 1).kind, "reporting-manager");
    assert.equal(classifyApproverRole("M", 1).kind, "business-unit-heads");
    assert.equal(classifyApproverRole("U", 1).kind, "workflow-group");
    assert.equal(classifyApproverRole("I", 1).kind, "initiator");
    assert.equal(classifyApproverRole("B", 1).kind, "recruitment-admin");
    assert.equal(classifyApproverRole("PF", 1).kind, "functional-manager");
    assert.equal(classifyApproverRole("PR", 1).kind, "reporting-manager");
  });

  it("leaves request-specific roles unresolved", () => {
    for (const code of ["H", "D", "A", "C"]) {
      assert.equal(classifyApproverRole(code, 1).kind, "depends-on-request");
      assert.ok(classifyApproverRole(code, 1).note);
    }
    assert.equal(classifyApproverRole("PF", 2).kind, "depends-on-request");
    assert.equal(classifyApproverRole("PR", 3).note, "Filled from the previous approver.");
    assert.equal(classifyApproverRole("", 1).kind, "depends-on-request");
  });
});

describe("assembleEmployeeApproverRows", () => {
  it("names the group when no member covers the employee", () => {
    const selection = selectApplicableWorkflows({
      ...employee,
      allowPartialWorkflow: 0,
      workflows: [workflow({ workflowId: 1, workflowName: "Leave", pageIds: [7] })],
    });
    const rows = assembleEmployeeApproverRows({
      pages: [{ pageId: 7, pageName: "Leave Request", moduleName: "Leave" }],
      details: [{ workflowId: 1, managerId: 44, roleCode: "U", level: 1 }],
      selection,
      groups: new Map([[44, { roleName: "HR", people: [] }]]),
      businessUnitHeads: [],
      recruitmentAdmins: [],
      functionalManager: null,
      reportingManager: null,
      initiator: { employeeId: 5, name: "Ada", employmentNumber: "E5" },
      hasBusinessUnit: true,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.roleName, "HR");
    assert.deepEqual(rows[0]?.people, []);
    assert.match(rows[0]?.note ?? "", /No member of HR covers/);
  });
});
