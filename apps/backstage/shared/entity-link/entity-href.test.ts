import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { entityHref, type EntityRef } from "./entity-href.ts";

const employerId = 10;

describe("entityHref", () => {
  it("builds a canonical url for each kind", () => {
    const cases: Array<[EntityRef, string]> = [
      [
        { kind: "employee", employmentNumber: "00007" },
        "/employers/10/employees/00007",
      ],
      [
        { kind: "employeeSection", employmentNumber: "A B", sectionId: 7 },
        "/employers/10/employees/A%20B/sections/7",
      ],
      [
        { kind: "fieldSection", section: "Bank Details" },
        "/employers/10/fields?section=Bank+Details",
      ],
      [
        { kind: "field", section: "Bank Details", fieldName: "Account Number" },
        "/employers/10/fields?section=Bank+Details&field=Account+Number",
      ],
      [{ kind: "workflow", workflowId: 4 }, "/employers/10/workflows/4"],
      [
        { kind: "workflowPage", pageName: "PersonalInformation" },
        "/employers/10/workflows?tab=pages&page=PersonalInformation",
      ],
      [
        { kind: "workflowGroup", roleId: 12 },
        "/employers/10/workflows?tab=groups&group=12",
      ],
      [{ kind: "role", roleId: 3 }, "/employers/10/roles?roleId=3"],
      [{ kind: "upload", uploadId: 9 }, "/employers/10/uploads/9"],
      [
        { kind: "changeRequest", changeRequestId: 10304 },
        "/employers/10/workflows?tab=requests&request=10304",
      ],
    ];
    for (const [ref, href] of cases) {
      assert.equal(entityHref(employerId, ref), href);
    }
  });

  it("returns null when the id or name is missing", () => {
    const missing: EntityRef[] = [
      { kind: "employee", employmentNumber: "  " },
      { kind: "employeeSection", employmentNumber: "00007", sectionId: 0 },
      { kind: "fieldSection", section: "" },
      { kind: "field", section: "Bank Details", fieldName: " " },
      { kind: "workflow", workflowId: -1 },
      { kind: "workflowPage", pageName: "" },
      { kind: "workflowGroup", roleId: 0 },
      { kind: "role", roleId: Number.NaN },
      { kind: "upload", uploadId: 1.5 },
      { kind: "changeRequest", changeRequestId: 0 },
    ];
    for (const ref of missing) {
      assert.equal(entityHref(employerId, ref), null);
    }
  });
});
