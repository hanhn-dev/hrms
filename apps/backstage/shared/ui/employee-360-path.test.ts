import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { employee360Area, employee360Title } from "./employee-360-path.ts";

const base = "/employers/1";

describe("employee360Area", () => {
  it("selects sections on a section detail path", () => {
    const area = employee360Area(`${base}/employees/E001/sections/10`, base);
    assert.equal(area, "sections");
    assert.equal(employee360Title(area!), "Sections");
  });

  it("selects sections on the sections list", () => {
    assert.equal(
      employee360Area(`${base}/employees/E001/sections`, base),
      "sections",
    );
  });

  it("selects change requests on the change-requests path", () => {
    const area = employee360Area(`${base}/employees/E001/change-requests`, base);
    assert.equal(area, "change-requests");
    assert.equal(employee360Title(area!), "Change requests");
  });

  it("selects profile on the employee root", () => {
    const area = employee360Area(`${base}/employees/E001`, base);
    assert.equal(area, "profile");
    assert.equal(employee360Title(area!), "Profile");
  });

  it("returns null outside an employee path", () => {
    assert.equal(employee360Area(`${base}/workflows`, base), null);
    assert.equal(employee360Area(`${base}/employees`, base), null);
  });
});
