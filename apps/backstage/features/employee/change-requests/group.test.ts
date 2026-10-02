import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ChangeRequestListItem } from "@hrms/db";
import {
  expandedWorkflowGroupKeys,
  groupChangeRequestsByWorkflow,
  NO_WORKFLOW_LABEL,
} from "./group.ts";

function request(
  patch: Partial<ChangeRequestListItem> & Pick<ChangeRequestListItem, "changeRequestId">,
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
});
