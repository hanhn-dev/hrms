import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  emailTriggersHref,
  notificationsDrilldownHref,
  parseEmailTriggersQuery,
  resolveEmailTriggersWindow,
} from "./email-triggers-source.ts";

describe("parseEmailTriggersQuery", () => {
  it("defaults to no module and a bounded window", () => {
    assert.deepEqual(parseEmailTriggersQuery({}), {
      module: null,
      from: null,
      to: null,
      rangeAll: false,
    });
  });

  it("accepts module and range=all", () => {
    assert.deepEqual(
      parseEmailTriggersQuery({
        module: "core",
        range: "all",
      }),
      {
        module: "core",
        from: null,
        to: null,
        rangeAll: true,
      },
    );
  });

  it("rejects unknown modules", () => {
    assert.equal(parseEmailTriggersQuery({ module: "TIMEPORT" }).module, null);
  });
});

describe("resolveEmailTriggersWindow", () => {
  it("uses the last 12 hours when no range is set", () => {
    const now = new Date("2026-11-04T12:00:00.000Z");
    const window = resolveEmailTriggersWindow(
      { module: null, from: null, to: null, rangeAll: false },
      now,
    );
    assert.equal(window.usingDefaultWindow, true);
    assert.equal(window.from?.toISOString(), "2026-11-04T00:00:00.000Z");
    assert.equal(window.to?.toISOString(), "2026-11-04T12:00:00.000Z");
  });

  it("clears bounds for range=all", () => {
    const window = resolveEmailTriggersWindow({
      module: null,
      from: null,
      to: null,
      rangeAll: true,
    });
    assert.deepEqual(window, {
      from: null,
      to: null,
      usingDefaultWindow: false,
    });
  });
});

describe("emailTriggersHref", () => {
  it("omits empty query params", () => {
    assert.equal(
      emailTriggersHref(9, {
        module: null,
        from: null,
        to: null,
        rangeAll: false,
      }),
      "/employers/9/email-triggers",
    );
  });

  it("keeps module and range=all", () => {
    assert.equal(
      emailTriggersHref(9, {
        module: "survey",
        from: null,
        to: null,
        rangeAll: true,
      }),
      "/employers/9/email-triggers?module=survey&range=all",
    );
  });
});

describe("notificationsDrilldownHref", () => {
  it("opens the email tab with status and applied window", () => {
    const href = notificationsDrilldownHref(
      9,
      {
        module: "core",
        from: null,
        to: null,
        rangeAll: false,
      },
      {
        status: "Under Review",
        from: "2026-11-04T00:00:00.000Z",
        to: "2026-11-04T12:00:00.000Z",
      },
    );
    assert.equal(
      href,
      "/employers/9/notifications?module=core&status=Under+Review&from=2026-11-04T00%3A00%3A00.000Z&to=2026-11-04T12%3A00%3A00.000Z",
    );
  });
});
