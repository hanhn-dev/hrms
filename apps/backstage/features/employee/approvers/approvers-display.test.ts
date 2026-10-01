import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  approverLabel,
  filterApproverRows,
  personLabel,
} from "./approvers-display.ts";

describe("personLabel", () => {
  it("appends the employment number", () => {
    assert.equal(
      personLabel({ name: "Anna", employmentNumber: "00001" }),
      "Anna (00001)",
    );
  });

  it("returns the name when there is no employment number", () => {
    assert.equal(personLabel({ name: "Anna", employmentNumber: null }), "Anna");
    assert.equal(personLabel({ name: "Anna", employmentNumber: "  " }), "Anna");
  });
});

describe("approverLabel", () => {
  it("shows the employment number", () => {
    assert.equal(
      approverLabel({ name: "Anna", employmentNumber: "00001" }),
      "00001",
    );
  });

  it("returns the name when there is no employment number", () => {
    assert.equal(approverLabel({ name: "Anna", employmentNumber: null }), "Anna");
    assert.equal(approverLabel({ name: "Anna", employmentNumber: "  " }), "Anna");
  });
});

describe("filterApproverRows", () => {
  const rows = [
    { moduleName: "Leave", pageName: "Leave Request", workflowName: "Leave Approval" },
    { moduleName: "Recruitment", pageName: "Hiring", workflowName: "Hiring Pullback" },
  ];

  it("returns every row for a blank query", () => {
    assert.deepEqual(filterApproverRows(rows, "  "), rows);
    assert.deepEqual(filterApproverRows([], "leave"), []);
  });

  it("matches module, page, or workflow without case", () => {
    assert.deepEqual(filterApproverRows(rows, "leave"), [rows[0]]);
    assert.deepEqual(filterApproverRows(rows, "PULLBACK"), [rows[1]]);
    assert.deepEqual(filterApproverRows(rows, "hiring"), [rows[1]]);
  });

  it("returns nothing when nothing matches", () => {
    assert.deepEqual(filterApproverRows(rows, "payroll"), []);
  });
});
