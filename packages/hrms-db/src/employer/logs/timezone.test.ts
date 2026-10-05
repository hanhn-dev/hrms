import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWindowsTimeZoneOffset, serverLocalBound } from "./timezone.ts";

describe("parseWindowsTimeZoneOffset", () => {
  it("reads the offset from a Windows display name", () => {
    assert.deepEqual(
      parseWindowsTimeZoneOffset(
        "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
      ),
      { label: "UTC+05:30", offsetMinutes: 330 },
    );
  });

  it("treats a bare UTC label as zero and rejects other text", () => {
    assert.deepEqual(parseWindowsTimeZoneOffset("(UTC) Coordinated Universal Time"), {
      label: "UTC",
      offsetMinutes: 0,
    });
    assert.equal(parseWindowsTimeZoneOffset("India Standard Time"), null);
    assert.equal(parseWindowsTimeZoneOffset(null), null);
  });
});

describe("serverLocalBound", () => {
  it("shifts a UTC instant by the employer offset", () => {
    const utc = new Date("2026-10-04T02:22:00.000Z");
    assert.equal(
      serverLocalBound(utc, 330).toISOString(),
      "2026-10-04T07:52:00.000Z",
    );
  });
});
