import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { employerMatchesQuery } from "./filter-employers.ts";

const sbPower = { employerId: 315, employerName: "SB-Power" };

describe("employerMatchesQuery", () => {
  it("matches an employer id", () => {
    assert.equal(employerMatchesQuery(sbPower, "315"), true);
    assert.equal(employerMatchesQuery(sbPower, " 316 "), false);
  });

  it("matches an employer name without case", () => {
    assert.equal(employerMatchesQuery(sbPower, "pow"), true);
    assert.equal(employerMatchesQuery(sbPower, "missing"), false);
  });

  it("keeps every employer when the query is blank", () => {
    assert.equal(employerMatchesQuery(sbPower, ""), true);
    assert.equal(employerMatchesQuery(sbPower, "   "), true);
  });
});
