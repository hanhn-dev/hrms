import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  employeeStatusColor,
  employeeStatusLabel,
  matchesEmployeeStatusFilter,
} from "./search-status.ts";

describe("employee search status", () => {
  it("labels Active, Active-Resigned, and InActive", () => {
    assert.equal(employeeStatusLabel("Active"), "Active");
    assert.equal(employeeStatusLabel("Active-Resigned"), "Active-Resigned");
    assert.equal(employeeStatusLabel("InActive"), "Inactive");
    assert.equal(employeeStatusColor("Active"), "green");
    assert.equal(employeeStatusColor("Active-Resigned"), "gold");
    assert.equal(employeeStatusColor("InActive"), "red");
  });

  it("shows a dash when status is missing", () => {
    assert.equal(employeeStatusLabel(null), "—");
    assert.equal(employeeStatusLabel(undefined), "—");
    assert.equal(employeeStatusLabel(""), "—");
    assert.equal(employeeStatusColor(null), "default");
  });

  it("matches each status filter on its own", () => {
    assert.equal(matchesEmployeeStatusFilter("Active", "active"), true);
    assert.equal(matchesEmployeeStatusFilter("Active-Resigned", "active"), false);
    assert.equal(
      matchesEmployeeStatusFilter("Active-Resigned", "active-resigned"),
      true,
    );
    assert.equal(matchesEmployeeStatusFilter("Active", "active-resigned"), false);
    assert.equal(matchesEmployeeStatusFilter("InActive", "inactive"), true);
    assert.equal(matchesEmployeeStatusFilter("Active", "inactive"), false);
    assert.equal(matchesEmployeeStatusFilter(null, "active"), false);
    assert.equal(matchesEmployeeStatusFilter("Active", "other"), false);
  });
});
