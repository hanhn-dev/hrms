import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { FlowGraph } from "./model";
import { buildJourney, searchNodes } from "./query";

const graph: FlowGraph = {
  version: 1,
  stats: { procedures: 3, routes: 0, unmatchedRoutes: 0, unmatchedSdkCalls: 0, dynamicSqlFiles: 0 },
  nodes: [
    { id: "p0", kind: "procedure", label: "USP_Root", detail: "HRMS", source: null, incomplete: false, gap: null },
    { id: "p1", kind: "procedure", label: "USP_Child", detail: "HRMS", source: null, incomplete: false, gap: null },
    { id: "p2", kind: "procedure", label: "USP_Grand", detail: "HRMS", source: null, incomplete: false, gap: null },
    { id: "p3", kind: "procedure", label: "USP_TooDeep", detail: "HRMS", source: null, incomplete: false, gap: null },
  ],
  edges: [
    { id: "e1", from: "p0", to: "p1", kind: "exec", label: "read from source", confidence: "extracted", sectionKey: null, source: null },
    { id: "e2", from: "p1", to: "p2", kind: "exec", label: "read from source", confidence: "extracted", sectionKey: null, source: null },
    { id: "e3", from: "p2", to: "p3", kind: "exec", label: "read from source", confidence: "extracted", sectionKey: null, source: null },
  ],
};

describe("buildJourney", () => {
  it("keeps the procedure call graph to two hops", () => {
    const journey = buildJourney(graph, "p0");
    assert.ok(journey);
    assert.deepEqual(
      journey.callNodes.map((node) => node.id).sort(),
      ["p0", "p1", "p2"],
    );
    assert.equal(journey.callNodes.some((node) => node.id === "p3"), false);
  });

  it("follows the last section procedure when a handler calls several", () => {
    const sectionGraph: FlowGraph = {
      version: 1,
      stats: graph.stats,
      nodes: [
        { id: "h", kind: "handler", label: "Put", detail: "", source: null, incomplete: false, gap: null },
        { id: "a", kind: "procedure", label: "USP_SaveBank", detail: "HRMS", source: null, incomplete: false, gap: null },
        { id: "b", kind: "procedure", label: "Usp_Mydetails_Enhanced_Process_Template", detail: "HRMS", source: null, incomplete: false, gap: null },
      ],
      edges: [
        { id: "1", from: "h", to: "a", kind: "exec", label: "section BANK_DETAILS", confidence: "extracted", sectionKey: "BANK_DETAILS", source: null },
        { id: "2", from: "h", to: "b", kind: "exec", label: "section BANK_DETAILS", confidence: "extracted", sectionKey: "BANK_DETAILS", source: null },
      ],
    };
    const journey = buildJourney(sectionGraph, "h");
    assert.equal(journey?.chain.at(-1)?.id, "b");
  });

  it("returns nothing when the search text is a single character", () => {
    assert.deepEqual(searchNodes(graph, "U"), []);
  });
});
