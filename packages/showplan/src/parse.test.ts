import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseShowplan } from "./parse.ts";

const PLAN = `
<ShowPlanXML xmlns="http://schemas.microsoft.com/sqlserver/2004/07/showplan">
  <BatchSequence>
    <Batch>
      <Statements>
        <StmtSimple StatementText="SELECT 1" StatementSubTreeCost="0.003">
          <QueryPlan>
            <RelOp NodeId="0" PhysicalOp="Nested Loops" LogicalOp="Inner Join" EstimateRows="2" EstimatedTotalSubtreeCost="0.003" EstimateIO="0" EstimateCPU="0.0002">
              <RunTimeInformation>
                <RunTimeCountersPerThread Thread="0" ActualRows="2" ActualElapsedms="4" />
              </RunTimeInformation>
              <NestedLoops>
                <RelOp NodeId="1" PhysicalOp="Clustered Index Seek" LogicalOp="Clustered Index Seek" EstimateRows="1" EstimatedTotalSubtreeCost="0.001">
                  <RunTimeInformation>
                    <RunTimeCountersPerThread Thread="0" ActualRows="1" ActualElapsedms="1" />
                    <RunTimeCountersPerThread Thread="1" ActualRows="1" ActualElapsedms="3" />
                  </RunTimeInformation>
                  <IndexScan>
                    <Object Database="[HRMS]" Schema="[dbo]" Table="[TEmployee]" Index="[PK_TEmployee]" />
                    <Predicate>
                      <ScalarOperator ScalarString="[dbo].[TEmployee].[Employerid]=(1)" />
                    </Predicate>
                  </IndexScan>
                </RelOp>
              </NestedLoops>
            </RelOp>
            <MissingIndexes>
              <MissingIndexGroup Impact="80">
                <MissingIndex Database="[HRMS]" Schema="[dbo]" Table="[TEmployee]">
                  <ColumnGroup Usage="EQUALITY">
                    <Column Name="[Employerid]" />
                  </ColumnGroup>
                </MissingIndex>
              </MissingIndexGroup>
            </MissingIndexes>
          </QueryPlan>
        </StmtSimple>
      </Statements>
    </Batch>
  </BatchSequence>
</ShowPlanXML>
`;

describe("parseShowplan", () => {
  it("builds a tree and sums actual rows across threads", () => {
    const [statement] = parseShowplan(PLAN);
    assert.ok(statement);
    assert.equal(statement.text, "SELECT 1");
    assert.equal(statement.cost, 0.003);
    assert.deepEqual(statement.missingIndexes, [
      "dbo.TEmployee (equality: Employerid) impact 80",
    ]);
    const root = statement.roots[0];
    assert.ok(root);
    assert.equal(root.physicalOp, "Nested Loops");
    assert.equal(root.actualRows, 2);
    assert.equal(root.estimateRows, 2);
    assert.equal(root.actualElapsedMs, 4);
    const seek = root.children[0];
    assert.ok(seek);
    assert.equal(seek.physicalOp, "Clustered Index Seek");
    assert.equal(seek.actualRows, 2);
    assert.equal(seek.estimateRows, 1);
    assert.equal(seek.subtreeCost, 0.001);
    assert.equal(seek.actualElapsedMs, 3);
    assert.equal(seek.objectName, "dbo.TEmployee (PK_TEmployee)");
    assert.deepEqual(
      seek.properties.find((row) => row.label === "Predicate"),
      { label: "Predicate", value: "[dbo].[TEmployee].[Employerid]=(1)" },
    );
  });

  it("keeps operators on the inner statement", () => {
    const statements = parseShowplan(`
      <ShowPlanXML>
        <StmtCond StatementText="IF">
          <Condition>
            <StmtSimple StatementText="SELECT flag">
              <QueryPlan>
                <RelOp PhysicalOp="Filter" EstimateRows="1" EstimatedTotalSubtreeCost="0.01">
                  <RunTimeInformation>
                    <RunTimeCountersPerThread ActualRows="1" ActualElapsedms="2" />
                  </RunTimeInformation>
                </RelOp>
              </QueryPlan>
            </StmtSimple>
          </Condition>
        </StmtCond>
      </ShowPlanXML>
    `);

    assert.equal(statements.length, 2);
    assert.equal(statements[0]?.text, "IF");
    assert.deepEqual(statements[0]?.roots, []);
    assert.equal(statements[1]?.text, "SELECT flag");
    assert.equal(statements[1]?.roots[0]?.physicalOp, "Filter");
  });

  it("returns nothing for an empty or unreadable document", () => {
    assert.deepEqual(parseShowplan(""), []);
    assert.deepEqual(parseShowplan("<ShowPlanXML"), []);
    assert.deepEqual(parseShowplan("<ShowPlanXML></ShowPlanXML>"), []);
  });
});
