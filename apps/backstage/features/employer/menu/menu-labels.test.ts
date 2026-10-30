import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { describeMenu, dropReasonLabel, historyWhenLabel } from "./menu-labels.ts";

const clear = {
  employerId: 12,
  health: "healthy" as const,
  inherited: false,
  source: "employer" as const,
  inXmlMissingFromHierarchy: [],
  inHierarchyMissingFromXml: [],
};

describe("describeMenu", () => {
  it("says the standard menu is not pushed out when you save it", () => {
    const status = describeMenu({ ...clear, employerId: 0 });
    assert.equal(status.title, "This is the standard menu");
    assert.equal(status.canShowInAccessRights, false);
  });

  it("says Access Right Management is empty when this organization stored a blank menu", () => {
    const status = describeMenu({ ...clear, health: "blank" });
    assert.equal(status.tone, "error");
    assert.equal(status.title, "Access Right Management is showing an empty menu");
    assert.equal(status.canShowInAccessRights, true);
  });

  it("says an empty record with no items of its own cannot be put back", () => {
    const status = describeMenu({ ...clear, health: "root-only", inherited: true });
    assert.equal(status.canShowInAccessRights, false);
  });

  it("says the organization is still on the standard menu", () => {
    const status = describeMenu({ ...clear, inherited: true, source: "template" });
    assert.equal(status.title, "This organization uses the standard menu");
  });

  it("names items that employees can open but Access Right Management cannot see", () => {
    const status = describeMenu({
      ...clear,
      inHierarchyMissingFromXml: [{ menuId: 1391, menuName: "alumni_portal" }],
    });
    assert.match(status.detail, /alumni_portal/);
    assert.equal(status.canShowInAccessRights, true);
  });

  it("says the menu matches when nothing is wrong", () => {
    assert.equal(describeMenu(clear).tone, "success");
  });

  it("leaves a missing history date as words, not a dash", () => {
    assert.equal(historyWhenLabel(null), "Date not recorded");
    assert.equal(historyWhenLabel("  "), "Date not recorded");
    assert.equal(dropReasonLabel("module-not-licensed"), "Module is not licensed for this organization");
  });
});
