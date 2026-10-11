import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { searchFeatureDocs, sequenceCharts } from "./feature-search.ts";

const docs = [
  { slug: "add-new-family-record", title: "Add new family record", feature: "Add new family record" },
  { slug: "bank-details", title: "Bank Details", feature: "Bank Details" },
];

describe("searchFeatureDocs", () => {
  it("matches a written feature by its name", () => {
    assert.deepEqual(
      searchFeatureDocs(docs, "family").map((hit) => hit.slug),
      ["add-new-family-record"],
    );
  });

  it("returns nothing for a single character or an unrelated word", () => {
    assert.deepEqual(searchFeatureDocs(docs, "f"), []);
    assert.deepEqual(searchFeatureDocs(docs, "passport"), []);
  });
});

describe("sequenceCharts", () => {
  it("keeps sequence diagrams and drops other mermaid charts", () => {
    const markdown = [
      "```mermaid",
      "flowchart TD",
      "  A --> B",
      "```",
      "",
      "```mermaid",
      "sequenceDiagram",
      "  actor User",
      "  User->>UI: submit",
      "```",
    ].join("\n");
    const charts = sequenceCharts(markdown);
    assert.equal(charts.length, 1);
    assert.match(charts[0] ?? "", /^sequenceDiagram/);
  });

  it("returns nothing when the page has no sequence diagram", () => {
    assert.deepEqual(sequenceCharts("# Title\n\nNo chart."), []);
  });
});
