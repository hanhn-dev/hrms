import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bindFunctionPayload,
  functionCallShape,
  functionCallText,
} from "./function-call.ts";

describe("functionCallText", () => {
  it("selects a scalar function", () => {
    assert.equal(functionCallShape("FN"), "scalar");
    assert.equal(
      functionCallText({
        schema: "dbo",
        name: "FN_Build",
        typeCode: "FN",
        parameterCount: 2,
        top: 20,
      }),
      "SELECT [dbo].[FN_Build](?, ?) AS [value]",
    );
  });

  it("selects from inline and multi-statement table functions", () => {
    assert.equal(functionCallShape("IF"), "table");
    assert.equal(functionCallShape(" tf "), "table");
    assert.equal(
      functionCallText({
        schema: "dbo",
        name: "TF_Rows",
        typeCode: "TF",
        parameterCount: 0,
        top: 20,
      }),
      "SELECT TOP (20) * FROM [dbo].[TF_Rows]()",
    );
    assert.equal(
      functionCallText({
        schema: "dbo",
        name: "IF_Rows",
        typeCode: "IF",
        parameterCount: 1,
        top: 20,
      }),
      "SELECT TOP (20) * FROM [dbo].[IF_Rows](?)",
    );
  });

  it("rejects other object types and unsafe identifiers", () => {
    assert.throws(() => functionCallShape("P"), /cannot be executed/i);
    assert.throws(
      () =>
        functionCallText({
          schema: "dbo",
          name: "bad-name",
          typeCode: "FN",
          parameterCount: 0,
          top: 20,
        }),
      /identifier/i,
    );
  });
});

describe("bindFunctionPayload", () => {
  it("rejects table-valued parameters with the procedure mapping error", () => {
    assert.throws(
      () =>
        bindFunctionPayload(
          [
            {
              name: "@Rows",
              dataType: "dbo.IdList",
              systemType: "table",
              isTableType: true,
            },
          ],
          { "@Rows": "" },
        ),
      /Table-valued parameter @Rows \(dbo\.IdList\) is not supported\. Flatten or omit this key\./,
    );
  });

  it("keeps empty strings for string parameters", () => {
    assert.deepEqual(
      bindFunctionPayload(
        [
          {
            name: "@Name",
            dataType: "nvarchar(50)",
            systemType: "nvarchar",
            isTableType: false,
          },
        ],
        { Name: "" },
      ),
      [""],
    );
  });
});
