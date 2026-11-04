import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  DEFAULT_STALE_DAYS,
  parseStaleDays,
  readStaleDaysPreference,
  resolveStaleDays,
  writeStaleDaysPreference,
  type StaleDaysStorage,
} from "./stale-days-preference.ts";

function memoryStorage(initial: Record<string, string> = {}): StaleDaysStorage & {
  store: Record<string, string>;
} {
  const store = { ...initial };
  return {
    store,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null;
    },
    setItem(key, value) {
      store[key] = value;
    },
  };
}

describe("parseStaleDays", () => {
  it("accepts allowed values", () => {
    assert.equal(parseStaleDays(2), 2);
    assert.equal(parseStaleDays("5"), 5);
    assert.equal(parseStaleDays(" 7 "), 7);
  });

  it("rejects invalid values", () => {
    assert.equal(parseStaleDays(4), null);
    assert.equal(parseStaleDays("nope"), null);
    assert.equal(parseStaleDays(null), null);
  });
});

describe("resolveStaleDays", () => {
  it("prefers a valid URL value over storage", () => {
    const storage = memoryStorage({ "backstage.azure.staleDays": "2" });
    assert.equal(resolveStaleDays({ urlValue: "7", storage }), 7);
  });

  it("uses storage when the URL is missing or invalid", () => {
    const storage = memoryStorage({ "backstage.azure.staleDays": "5" });
    assert.equal(resolveStaleDays({ urlValue: null, storage }), 5);
    assert.equal(resolveStaleDays({ urlValue: "9", storage }), 5);
  });

  it("defaults when storage is empty or blocked", () => {
    assert.equal(resolveStaleDays({ urlValue: null, storage: null }), DEFAULT_STALE_DAYS);
    assert.equal(resolveStaleDays({ storage: memoryStorage() }), DEFAULT_STALE_DAYS);
  });
});

describe("read/write preference", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    writeStaleDaysPreference(5, storage);
    assert.equal(readStaleDaysPreference(storage), 5);
  });

  it("ignores invalid stored values", () => {
    const storage = memoryStorage({ "backstage.azure.staleDays": "99" });
    assert.equal(readStaleDaysPreference(storage), DEFAULT_STALE_DAYS);
  });
});
