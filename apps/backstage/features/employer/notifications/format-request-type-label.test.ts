import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatRequestTypeLabel } from "./format-request-type-label.ts";

describe("formatRequestTypeLabel", () => {
  it("spaces PascalCase request types", () => {
    assert.equal(formatRequestTypeLabel("AttendanceOverTime"), "Attendance Over Time");
    assert.equal(formatRequestTypeLabel("LeaveRequest"), "Leave Request");
  });

  it("keeps acronym runs before a capital word", () => {
    assert.equal(formatRequestTypeLabel("PreApprovalOTRequest"), "Pre Approval OT Request");
  });

  it("spaces digits from letters", () => {
    assert.equal(formatRequestTypeLabel("Level2Approver"), "Level 2 Approver");
  });

  it("returns blank input unchanged", () => {
    assert.equal(formatRequestTypeLabel(""), "");
    assert.equal(formatRequestTypeLabel("   "), "");
  });
});
