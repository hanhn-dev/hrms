import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { Prisma } from "../../generated/prisma/client.ts";
import { renderQueryCall } from "../../shared/query-script.ts";
import { employerListOrder } from "./index.ts";

describe("employerListOrder", () => {
  it("puts active employers before inactive ones, then id", () => {
    assert.equal(
      renderQueryCall(Prisma.sql`ORDER BY ${employerListOrder()}`, []),
      "ORDER BY CASE WHEN Employer.IsActive = 1 THEN 0 ELSE 1 END, Employer.Employerid ASC",
    );
  });
});
