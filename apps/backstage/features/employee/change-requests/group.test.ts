import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ChangeRequestListItem } from "@hrms/db";
import {
  expandedWorkflowGroupKeys,
  groupChangeRequestsByWorkflow,
  NO_WORKFLOW_LABEL,
  requestCountLabel,
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
