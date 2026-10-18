import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatExecScript, type ExecParameter } from "./script-exec-text.ts";

const parameters: readonly ExecParameter[] = [
  { name: "@employeeId", dataType: "int" },
  { name: "@name", dataType: "nvarchar(100)" },
  { name: "@asOf", dataType: "date" },
  { name: "@count", dataType: "int", mode: "out" },
];

describe("formatExecScript", () => {
  it("writes typed values as pasteable T-SQL", () => {
    const script = formatExecScript("dbo", "SP_MyDetails_GetNomineeDetails", parameters, {
      "@employeeId": "1431",
      "@name": "O'Brien",
      "@asOf": "   ",
      "@count": "2",
    });

    assert.equal(
      script,
      [
        "EXEC dbo.SP_MyDetails_GetNomineeDetails",
        "\t@employeeId = 1431,",
        "\t@name = N'O''Brien',",
        "\t@asOf = NULL,",
        "\t@count = 2 OUTPUT",
      ].join("\n"),
    );
  });

  it("returns the header when the routine has no parameters", () => {
    assert.equal(formatExecScript("dbo", "SP_Ping", [], {}), "EXEC dbo.SP_Ping");
  });
});
