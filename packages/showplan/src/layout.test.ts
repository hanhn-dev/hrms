import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { layoutPlan } from "./layout.ts";
import { parseShowplan } from "./parse.ts";

const PLAN = `
<ShowPlanXML xmlns="http://schemas.microsoft.com/sqlserver/2004/07/showplan">
  <StmtSimple StatementText="SELECT 1" StatementSubTreeCost="0.003">
    <QueryPlan>
      <RelOp NodeId="0" PhysicalOp="Nested Loops" LogicalOp="Inner Join" EstimateRows="2" EstimatedTotalSubtreeCost="0.003">
        <NestedLoops>
          <RelOp NodeId="1" PhysicalOp="Clustered Index Seek" EstimateRows="1" EstimatedTotalSubtreeCost="0.001" />
        </NestedLoops>
      </RelOp>
    </QueryPlan>
  </StmtSimple>
</ShowPlanXML>
`;

describe("layoutPlan", () => {
  it("places the root to the left and splits statement cost", () => {
    const [statement] = layoutPlan(parseShowplan(PLAN));
    assert.ok(statement);
    const select = statement.roots[0];
    const root = select?.children[0];
    const seek = root?.children[0];
    assert.ok(select);
    assert.ok(root);
    assert.ok(seek);
    assert.equal(select.node.physicalOp, "SELECT");
    assert.equal(select.x, 0);
    assert.ok(root.x > select.x);
    assert.ok(seek.x > 0);
    assert.equal(root.costPercent?.toFixed(1), "66.7");
    assert.equal(seek.costPercent?.toFixed(1), "33.3");
  });
});
