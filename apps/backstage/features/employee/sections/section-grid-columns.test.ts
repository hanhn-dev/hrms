import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { sectionGridColumns } from "./section-grid-columns.ts";

describe("sectionGridColumns", () => {
  it("splits a resolved lookup into the name and a separate id column", () => {
    const columns = sectionGridColumns(
      [
        { displayText: "Domain" },
        { displayText: "Experience (Years)" },
      ],
      [{ lookups: { Domain: { id: 829 } } }],
    );
    assert.deepEqual(columns, [
      { kind: "lookup-name", title: "Domain", displayText: "Domain" },
      { kind: "lookup-id", title: "Domain Id", displayText: "Domain" },
      { kind: "value", title: "Experience (Years)", displayText: "Experience (Years)" },
    ]);
  });

  it("keeps a stored name as one column", () => {
    const columns = sectionGridColumns(
      [{ displayText: "Relationship" }],
      [{ lookups: {} }],
    );
    assert.deepEqual(columns, [
      { kind: "value", title: "Relationship", displayText: "Relationship" },
    ]);
  });

  it("does not append a second Id when the label already ends with it", () => {
    const columns = sectionGridColumns(
      [{ displayText: "Level Id" }],
      [{ lookups: { "Level Id": { id: 3 } } }],
    );
    assert.equal(columns[1]?.title, "Level Id");
    assert.equal(columns[0]?.kind, "lookup-name");
  });
});
