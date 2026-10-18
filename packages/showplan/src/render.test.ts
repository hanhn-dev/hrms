import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { renderShowplan } from "./render.ts";

const PLAN = `
<ShowPlanXML xmlns="http://schemas.microsoft.com/sqlserver/2004/07/showplan">
  <StmtSimple StatementText="SELECT 1" StatementSubTreeCost="0.003">
    <QueryPlan>
      <RelOp NodeId="0" PhysicalOp="Nested Loops" LogicalOp="Inner Join" EstimateRows="2" EstimatedTotalSubtreeCost="0.003">
        <Warnings>
          <ColumnsWithNoStatistics />
        </Warnings>
        <NestedLoops>
          <RelOp NodeId="1" PhysicalOp="Clustered Index Seek" EstimateRows="1" EstimatedTotalSubtreeCost="0.001" />
        </NestedLoops>
      </RelOp>
    </QueryPlan>
  </StmtSimple>
</ShowPlanXML>
`;

describe("renderShowplan", () => {
  it("draws an icon node for the statement and each operator", () => {
    const host = document.createElement("div");
    renderShowplan(host, PLAN);
    const cards = [...host.querySelectorAll(".hrms-plan-node")].map(
      (card) => card.textContent,
    );
    assert.equal(cards.length, 3);
    assert.match(cards[0] ?? "", /SELECT/);
    assert.match(cards[1] ?? "", /Nested Loops/);
    assert.match(cards[1] ?? "", /\(Inner Join\)/);
    assert.match(cards[2] ?? "", /Clustered Index Seek/);
    const nodes = [...host.querySelectorAll<HTMLElement>(".hrms-plan-node")];
    assert.equal(nodes[0]?.style.left, "0px");
    assert.ok(Number.parseFloat(nodes[1]?.style.left ?? "0") > 0);
    assert.equal(nodes[0]?.querySelector(".hrms-plan-icon")?.getAttribute("data-icon"), "Statement");
    assert.equal(nodes[1]?.querySelector(".hrms-plan-icon")?.getAttribute("data-icon"), "NestedLoops");
    assert.equal(host.querySelectorAll(".hrms-plan-rows").length, 2);
    assert.equal(
      host.querySelector(".hrms-plan-node[data-warning='true']")?.textContent?.includes("Nested Loops"),
      true,
    );
    assert.equal(host.querySelectorAll("path[marker-end]").length, 2);
  });

  it("says when the document cannot be read", () => {
    const host = document.createElement("div");
    renderShowplan(host, "<ShowPlanXML");
    assert.equal(host.textContent, "The plan could not be read.");
  });
});
