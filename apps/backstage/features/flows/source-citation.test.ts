import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseSourceCitation } from "./source-citation.ts";

describe("parseSourceCitation", () => {
  it("reads a source file and line from the steps table", () => {
    assert.deepEqual(
      parseSourceCitation(
        "HRMS.Web/HRMS.Web/HRM/MyDetails_React/src/components/sections/familyDetails/FamilyDetails.tsx:395",
      ),
      {
        repo: "sourcecode",
        path: "HRMS.Web/HRMS.Web/HRM/MyDetails_React/src/components/sections/familyDetails/FamilyDetails.tsx",
        line: 395,
        column: 1,
      },
    );
  });

  it("maps an SDK path onto the package root and keeps database paths inside the checkout", () => {
    assert.deepEqual(parseSourceCitation("hrms-sdk/src/hooks/useFamily.ts:34"), {
      repo: "hrms-sdk",
      path: "src/hooks/useFamily.ts",
      line: 34,
      column: 1,
    });
    assert.equal(
      parseSourceCitation("HRMS-DATABASE/HRMS/STOREPROCEDURE/Usp_Example.sql:205")?.path,
      "HRMS-DATABASE/HRMS/STOREPROCEDURE/Usp_Example.sql",
    );
  });

  it("leaves ordinary code and a path that leaves the repo alone", () => {
    assert.equal(parseSourceCitation("FamilyDetailsForm"), null);
    assert.equal(parseSourceCitation("HRMS.Web/../secret.txt:1"), null);
    assert.equal(parseSourceCitation(""), null);
  });
});
