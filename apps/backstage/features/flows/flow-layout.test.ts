import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { CALL_COLUMN_GAP, CALL_NODE_WIDTH, layoutCallGraph } from "./flow-layout";
import type { FlowEdge, FlowNode } from "./model";

const source: FlowNode = {
  id: "parent",
  kind: "procedure",
  label: "SP_MyDetails_GetEmployeeDetailsForGivenFields",
  detail: "HRMS",
  source: null,
  incomplete: true,
  gap: "This file calls sp_executesql, so some procedure calls are not in the graph.",
};

const child: FlowNode = {
  id: "child",
  kind: "procedure",
  label: "Sp_OpenEncryptionKeys",
  detail: "HRMS",
  source: null,
  incomplete: false,
  gap: null,
};

const edge: FlowEdge = {
  id: "e1",
  from: "parent",
  to: "child",
  kind: "exec",
  label: "read from source",
  confidence: "extracted",
  sectionKey: null,
  source: null,
};

describe("layoutCallGraph", () => {
  it("leaves a gap between columns wider than the card", () => {
    const layout = layoutCallGraph([source, child], [edge]);
    const parent = layout.nodes.find((node) => node.id === "parent");
    const target = layout.nodes.find((node) => node.id === "child");
    assert.ok(parent);
    assert.ok(target);
    assert.equal(target.x - parent.x, CALL_NODE_WIDTH + CALL_COLUMN_GAP);
    assert.ok(target.x >= parent.x + parent.width);
  });

  it("stacks a later card below a tall warning card in the same column", () => {
    const tall: FlowNode = { ...child, id: "tall", gap: source.gap, incomplete: true };
    const next: FlowNode = { ...child, id: "next", label: "SP_CloseEncryptionKey" };
    const layout = layoutCallGraph(
      [source, tall, next],
      [
        { ...edge, id: "a", to: "tall" },
        { ...edge, id: "b", to: "next" },
      ],
    );
    const tallCard = layout.nodes.find((node) => node.id === "tall");
    const nextCard = layout.nodes.find((node) => node.id === "next");
    assert.ok(tallCard);
    assert.ok(nextCard);
    assert.equal(tallCard.x, nextCard.x);
    assert.ok(nextCard.y >= tallCard.y + tallCard.height);
  });

  it("omits the repeated source label and keeps a section label", () => {
    const layout = layoutCallGraph([source, child], [
      edge,
      { ...edge, id: "e2", sectionKey: "BANK_DETAILS", label: "section BANK_DETAILS" },
    ]);
    assert.equal(layout.edges.find((item) => item.id === "e1")?.label, null);
    assert.equal(layout.edges.find((item) => item.id === "e2")?.label, "section BANK_DETAILS");
  });
});
