import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  normalizeDeliveryStatus,
  parseDeliveryStatus,
} from "./status.ts";

describe("normalizeDeliveryStatus", () => {
  it("labels sent rows", () => {
    assert.equal(
      normalizeDeliveryStatus({
        emailId: 10,
        emailSent: 1,
        sentAttempts: 1,
      }),
      "Sent",
    );
  });

  it("labels missing outbox rows as Not Queued", () => {
    assert.equal(
      normalizeDeliveryStatus({
        emailId: null,
        emailSent: 0,
        sentAttempts: null,
      }),
      "Not Queued",
    );
  });

  it("labels poison attempts separately from Queued", () => {
    assert.equal(
      normalizeDeliveryStatus({
        emailId: 11,
        emailSent: 0,
        sentAttempts: 7,
      }),
      "Poisoned",
    );
    assert.equal(
      normalizeDeliveryStatus({
        emailId: 12,
        emailSent: 0,
        sentAttempts: 9,
      }),
      "Poisoned",
    );
    assert.equal(
      normalizeDeliveryStatus({
        emailId: 13,
        emailSent: 0,
        sentAttempts: 2,
      }),
      "Queued",
    );
  });
});

describe("parseDeliveryStatus", () => {
  it("accepts known delivery labels only", () => {
    assert.equal(parseDeliveryStatus("Sent"), "Sent");
    assert.equal(parseDeliveryStatus("Not Queued"), "Not Queued");
    assert.equal(parseDeliveryStatus("queued"), null);
  });
});
