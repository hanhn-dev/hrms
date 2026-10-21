import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isTransientDbConnectionError } from "./connection-error.ts";

describe("isTransientDbConnectionError", () => {
  it("detects mssql ESOCKET hang-ups", () => {
    assert.equal(
      isTransientDbConnectionError({
        code: "ESOCKET",
        message: "Connection lost - socket hang up",
      }),
      true,
    );
  });

  it("detects Prisma P1017 from the message alone", () => {
    assert.equal(
      isTransientDbConnectionError({
        message: "Connection lost: The server closed the connection.",
      }),
      true,
    );
  });

  it("ignores unrelated query errors", () => {
    assert.equal(
      isTransientDbConnectionError({
        code: "EREQUEST",
        message: "Invalid object name 'dbo.Missing'.",
      }),
      false,
    );
    assert.equal(isTransientDbConnectionError(null), false);
    assert.equal(isTransientDbConnectionError("boom"), false);
  });
});
