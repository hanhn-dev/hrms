import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HISTORY_SECTIONS } from "../history/sections.ts";
import { SECTION_COUNT_SPECS } from "./specs.ts";

describe("SECTION_COUNT_SPECS", () => {
  it("covers every HISTORY_SECTIONS entry in the same order", () => {
    assert.equal(SECTION_COUNT_SPECS.length, HISTORY_SECTIONS.length);
    for (let i = 0; i < HISTORY_SECTIONS.length; i += 1) {
      const expected = HISTORY_SECTIONS[i]!;
      const actual = SECTION_COUNT_SPECS[i]!;
      assert.equal(actual.sectionId, expected.sectionId);
      assert.equal(actual.sectionName, expected.name);
      assert.equal(actual.label, expected.label);
    }
  });

  it("assigns a source to every section", () => {
    for (const spec of SECTION_COUNT_SPECS) {
      assert.ok(spec.source.length > 0, spec.sectionName);
    }
  });

  it("marks Personal and Employment as employee-presence", () => {
    const personal = SECTION_COUNT_SPECS.find((s) => s.sectionName === "Personal Details");
    const employment = SECTION_COUNT_SPECS.find(
      (s) => s.sectionName === "Current Employment Details",
    );
    assert.equal(personal?.source, "employee-presence");
    assert.equal(employment?.source, "employee-presence");
  });

  it("folds visa into passport section source", () => {
    const passport = SECTION_COUNT_SPECS.find((s) => s.sectionName === "Passport Details");
    assert.equal(passport?.source, "passport-visa");
    assert.equal(passport?.label, "Passport & Visa Details");
  });
});
