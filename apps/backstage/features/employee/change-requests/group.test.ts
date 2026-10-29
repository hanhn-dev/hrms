import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ChangeRequestListItem } from "@hrms/db";
import {
  applyWorkflowCounts,
  expandedWorkflowGroupKeys,
  groupChangeRequestsByWorkflow,
  NO_WORKFLOW_LABEL,
  requestCountLabel,
  showWorkflowPendingTag,
  statusTabLabel,
  workflowGroupCaption,
} from "./group.ts";

function request(
  patch: Partial<ChangeRequestListItem> &
    Pick<ChangeRequestListItem, "changeRequestId">,
): ChangeRequestListItem {
  return {
    employeeId: 1,
    employeeName: "Ada",
    employmentNumber: "E001",
    pageName: "My Details",
    sectionNames: "Bank Details",
    createdBy: 1,
    createdByName: "Ada",
    createdByEmploymentNumber: "E001",
    requestedDate: "2026-01-01T00:00:00.000Z",
    status: "approved",
    workflowId: null,
    workflowName: null,
    workflowIsDefault: false,
    workflowAllLocations: false,
    workflowAllBusinessUnits: false,
    workflowLocationNames: null,
    workflowBusinessUnitNames: null,
    workflowCreatedDate: null,
    approvers: [],
    ...patch,
  };
}

describe("groupChangeRequestsByWorkflow", () => {
  it("returns nothing for an empty list", () => {
    assert.deepEqual(groupChangeRequestsByWorkflow([]), []);
    assert.deepEqual(expandedWorkflowGroupKeys([]), []);
  });

  it("puts requests with no workflow in one group", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({ changeRequestId: 2, workflowName: "  " }),
      request({ changeRequestId: 1, workflowName: null }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.workflowName, NO_WORKFLOW_LABEL);
    assert.deepEqual(
      groups[0]?.requests.map((row) => row.changeRequestId),
      [2, 1],
    );
  });

  it("lists groups that still have pending requests first, then by name", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({
        changeRequestId: 1,
        workflowId: 10,
        workflowName: "Zeta",
        status: "approved",
      }),
      request({
        changeRequestId: 2,
        workflowId: 11,
        workflowName: "Alpha",
        status: "pending",
      }),
      request({
        changeRequestId: 3,
        workflowId: 12,
        workflowName: "Beta",
        status: "rejected",
      }),
    ]);
    assert.deepEqual(
      groups.map((group) => group.workflowName),
      ["Alpha", "Beta", "Zeta"],
    );
    assert.equal(groups[0]?.pendingCount, 1);
    assert.deepEqual(expandedWorkflowGroupKeys(groups), ["id:11"]);
  });

  it("opens every group when none are pending", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({ changeRequestId: 1, workflowId: 4, workflowName: "Bank" }),
      request({ changeRequestId: 2, workflowId: 5, workflowName: "Address" }),
    ]);
    assert.deepEqual(expandedWorkflowGroupKeys(groups), ["id:5", "id:4"]);
  });

  it("merges rows that share a workflow id", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({
        changeRequestId: 8,
        workflowId: 3,
        workflowName: "Personal",
        status: "pending",
      }),
      request({
        changeRequestId: 7,
        workflowId: 3,
        workflowName: "Personal",
        status: "approved",
      }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.pendingCount, 1);
    assert.equal(groups[0]?.requests.length, 2);
  });

  it("names the group size as requests", () => {
    assert.equal(requestCountLabel(0), "0 requests");
    assert.equal(requestCountLabel(1), "1 request");
    assert.equal(requestCountLabel(17), "17 requests");
  });

  it("leaves a unique workflow name unlabeled", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({
        changeRequestId: 1,
        workflowId: 4,
        workflowName: "Bank",
        workflowLocationNames: "Pune",
      }),
    ]);
    assert.equal(workflowGroupCaption(groups[0]!, groups, null), null);
  });

  it("labels repeated workflow names with location, business unit, or default", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({
        changeRequestId: 1,
        workflowId: 11,
        workflowName: "Employee information updation",
        workflowLocationNames: "Pune",
        workflowIsDefault: true,
      }),
      request({
        changeRequestId: 2,
        workflowId: 22,
        workflowName: "Employee information updation",
        workflowBusinessUnitNames: "Finance",
        workflowAllLocations: true,
      }),
      request({
        changeRequestId: 3,
        workflowId: 86,
        workflowName: "Employee information updation",
        workflowAllBusinessUnits: true,
      }),
    ]);
    assert.deepEqual(
      groups.map((group) => workflowGroupCaption(group, groups, null)),
      ["Pune · Default", "All locations · Finance", "All business units"],
    );
  });

  it("uses the created date when a repeated name has no scope", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({
        changeRequestId: 1,
        workflowId: 11,
        workflowName: "Employee information updation",
        workflowCreatedDate: "2026-03-01T00:00:00.000Z",
      }),
      request({
        changeRequestId: 2,
        workflowId: 22,
        workflowName: "Employee information updation",
        workflowLocationNames: "  ",
      }),
    ]);
    assert.equal(
      workflowGroupCaption(groups[0]!, groups, "01-Mar-2026"),
      "Created 01-Mar-2026",
    );
    assert.equal(workflowGroupCaption(groups[1]!, groups, "—"), null);
  });
});

describe("status and workflow totals", () => {
  it("labels every status tab with its count, including zero", () => {
    assert.equal(statusTabLabel("all", 0), "All 0");
    assert.equal(statusTabLabel("pending", 38), "Pending 38");
    assert.equal(statusTabLabel("approved", 150), "Approved 150");
    assert.equal(statusTabLabel("rejected", 26), "Rejected 26");
  });

  it("keeps the page counts when the database sent no workflow totals", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({
        changeRequestId: 1,
        workflowId: 10,
        workflowName: "Alpha",
        status: "pending",
      }),
    ]);
    const applied = applyWorkflowCounts(groups, []);
    assert.equal(applied[0]?.requestCount, 1);
    assert.equal(applied[0]?.pendingCount, 1);
    assert.equal(showWorkflowPendingTag("approved", applied[0]?.pendingCount ?? 0), false);
  });

  it("replaces a named workflow's page size with the database total", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({
        changeRequestId: 1,
        workflowId: 10,
        workflowName: "Alpha",
        status: "approved",
      }),
    ]);
    const applied = applyWorkflowCounts(groups, [
      {
        workflowId: 10,
        workflowName: "Alpha",
        requestCount: 214,
        pendingCount: 38,
      },
    ]);
    assert.equal(applied[0]?.requestCount, 214);
    assert.equal(applied[0]?.pendingCount, 38);
    assert.equal(applied[0]?.requests.length, 1);
    assert.equal(showWorkflowPendingTag("all", 38), true);
    assert.equal(showWorkflowPendingTag("pending", 38), false);
    assert.equal(showWorkflowPendingTag("approved", 38), false);
    assert.equal(showWorkflowPendingTag("rejected", 0), false);
    assert.deepEqual(expandedWorkflowGroupKeys(applied), ["id:10"]);
  });

  it("folds blank workflow names into No workflow and sums them", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({ changeRequestId: 1, workflowId: 9, workflowName: null }),
    ]);
    const applied = applyWorkflowCounts(groups, [
      {
        workflowId: 9,
        workflowName: "  ",
        requestCount: 3,
        pendingCount: 1,
      },
      {
        workflowId: 4,
        workflowName: null,
        requestCount: 4,
        pendingCount: 1,
      },
    ]);
    assert.equal(applied.length, 1);
    assert.equal(applied[0]?.workflowName, NO_WORKFLOW_LABEL);
    assert.equal(applied[0]?.key, "name:no workflow");
    assert.equal(applied[0]?.requestCount, 7);
    assert.equal(applied[0]?.pendingCount, 2);
  });

  it("sorts a group with database pending ahead of one that is only pending on this page", () => {
    const groups = groupChangeRequestsByWorkflow([
      request({
        changeRequestId: 1,
        workflowId: 11,
        workflowName: "Beta",
        status: "pending",
      }),
      request({
        changeRequestId: 2,
        workflowId: 10,
        workflowName: "Alpha",
        status: "approved",
      }),
    ]);
    const applied = applyWorkflowCounts(groups, [
      {
        workflowId: 11,
        workflowName: "Beta",
        requestCount: 3,
        pendingCount: 0,
      },
      {
        workflowId: 10,
        workflowName: "Alpha",
        requestCount: 20,
        pendingCount: 4,
      },
    ]);
    assert.deepEqual(
      applied.map((group) => group.workflowName),
      ["Alpha", "Beta"],
    );
    assert.deepEqual(expandedWorkflowGroupKeys(applied), ["id:10"]);
  });
});
