import { DEVTOOLS_ATTACHED_ERROR, debuggerAttachErrorMessage } from "./debugger-error";
import {
  MAX_CAPTURE_ROWS,
  applyNetworkEvent,
  createCaptureState,
  durationSeconds,
  filterNetworkRows,
  formatInitiator,
  formatSeconds,
  listCaptureRows,
  matchesNetworkSearch,
  filterNetworkRowsBySearch,
  sortNetworkRows,
  visibleNetworkRows,
  waitingSecondsFromTiming,
  handlingSecondsFromTiming,
  type CaptureState,
  type NetworkTimingRow,
} from "./timing";

function row(partial: Partial<NetworkTimingRow> & Pick<NetworkTimingRow, "requestId">): NetworkTimingRow {
  return {
    url: partial.url ?? `https://hrms.example/${partial.requestId}`,
    method: partial.method ?? "GET",
    resourceType: partial.resourceType ?? "XHR",
    initiatorLabel: partial.initiatorLabel ?? "app.js:10",
    status: partial.status === undefined ? 200 : partial.status,
    cached: partial.cached ?? false,
    durationSeconds:
      partial.durationSeconds === undefined ? 1 : partial.durationSeconds,
    waitingSeconds: partial.waitingSeconds ?? null,
    handlingSeconds: partial.handlingSeconds ?? null,
    startedAt: partial.startedAt ?? 1,
    ...partial,
  };
}

describe("formatInitiator", () => {
  it("formats a script stack frame as file.js:line (positive)", () => {
    expect(
      formatInitiator({
        type: "script",
        stack: {
          callFrames: [
            {
              url: "https://hrms.example/static/js/app.js?v=1",
              lineNumber: 9,
            },
          ],
        },
      }),
    ).toBe("app.js:10");
  });

  it("returns an em dash when the initiator is missing (negative)", () => {
    expect(formatInitiator(undefined)).toBe("—");
    expect(formatInitiator(null)).toBe("—");
    expect(formatInitiator({})).toBe("—");
  });

  it("keeps non-script types and ignores a blank file name (edge)", () => {
    expect(formatInitiator({ type: "parser" })).toBe("parser");
    expect(formatInitiator({ type: "preflight" })).toBe("preflight");
    expect(
      formatInitiator({
        type: "script",
        url: "https://hrms.example/static/js/app.js",
      }),
    ).toBe("app.js");
  });
});

describe("duration and waiting", () => {
  it("formats a 4.2s call, 3.8s of waiting, and 3.6s of handling (positive)", () => {
    expect(durationSeconds(10, 14.2)).toBeCloseTo(4.2);
    expect(waitingSecondsFromTiming({ receiveHeadersEnd: 3800 })).toBeCloseTo(3.8);
    expect(
      handlingSecondsFromTiming({ sendEnd: 200, receiveHeadersStart: 3800 }),
    ).toBeCloseTo(3.6);
    expect(formatSeconds(4.2)).toBe("4.20");
    expect(formatSeconds(3.8)).toBe("3.80");
    expect(formatSeconds(3.6)).toBe("3.60");
  });

  it("returns null when the finish is missing or before the start (negative)", () => {
    expect(durationSeconds(null, 5)).toBeNull();
    expect(durationSeconds(5, 4)).toBeNull();
    expect(waitingSecondsFromTiming({ receiveHeadersEnd: -1 })).toBeNull();
    expect(
      handlingSecondsFromTiming({ sendEnd: -1, receiveHeadersStart: 3800 }),
    ).toBeNull();
    expect(formatSeconds(null)).toBe("…");
  });

  it("treats non-finite timestamps as missing (edge)", () => {
    expect(durationSeconds(Number.NaN, 1)).toBeNull();
    expect(waitingSecondsFromTiming(undefined)).toBeNull();
    expect(waitingSecondsFromTiming({})).toBeNull();
    expect(handlingSecondsFromTiming(undefined)).toBeNull();
    expect(handlingSecondsFromTiming({ sendEnd: 500, receiveHeadersStart: 100 })).toBeNull();
    expect(formatSeconds(Number.POSITIVE_INFINITY)).toBe("…");
  });
});

describe("sortNetworkRows", () => {
  it("puts the slower finished call first (positive)", () => {
    const sorted = sortNetworkRows([
      row({ requestId: "fast", durationSeconds: 0.3, url: "https://hrms.example/fast" }),
      row({ requestId: "slow", durationSeconds: 4.2, url: "https://hrms.example/slow" }),
    ]);
    expect(sorted.map((entry) => entry.requestId)).toEqual(["slow", "fast"]);
  });

  it("does not throw when a failed row has no HTTP status (negative)", () => {
    const sorted = sortNetworkRows([
      row({ requestId: "ok", durationSeconds: 0.2, status: 200 }),
      row({ requestId: "bad", durationSeconds: 1.5, status: "failed" }),
    ]);
    expect(sorted[0]?.requestId).toBe("bad");
    expect(sorted[0]?.status).toBe("failed");
  });

  it("keeps pending rows below finished rows and preserves equal durations (edge)", () => {
    const sorted = sortNetworkRows([
      row({ requestId: "pending", durationSeconds: null, status: null }),
      row({ requestId: "tie-a", durationSeconds: 1, startedAt: 1 }),
      row({ requestId: "tie-b", durationSeconds: 1, startedAt: 2 }),
    ]);
    expect(sorted.map((entry) => entry.requestId)).toEqual([
      "tie-a",
      "tie-b",
      "pending",
    ]);
  });
});

describe("filterNetworkRows", () => {
  const rows = [
    row({ requestId: "api", resourceType: "Fetch" }),
    row({ requestId: "script", resourceType: "Script", url: "https://hrms.example/app.js" }),
  ];

  it("hides scripts unless show-all is on (negative)", () => {
    expect(filterNetworkRows(rows, false).map((entry) => entry.requestId)).toEqual([
      "api",
    ]);
    expect(filterNetworkRows(rows, true).map((entry) => entry.requestId)).toEqual([
      "api",
      "script",
    ]);
  });
});

describe("matchesNetworkSearch", () => {
  const rows = [
    row({
      requestId: "save",
      url: "https://hrms.example/api/education/save",
      method: "POST",
      initiatorLabel: "education.js:42",
    }),
    row({
      requestId: "list",
      url: "https://hrms.example/api/education/list",
      method: "GET",
      status: 500,
    }),
  ];

  it("filters by URL substring (positive)", () => {
    expect(
      filterNetworkRowsBySearch(rows, "education/save").map((entry) => entry.requestId),
    ).toEqual(["save"]);
    expect(
      visibleNetworkRows(rows, true, "POST").map((entry) => entry.requestId),
    ).toEqual(["save"]);
  });

  it("returns no rows when nothing matches (negative)", () => {
    expect(filterNetworkRowsBySearch(rows, "passport")).toEqual([]);
    expect(matchesNetworkSearch(rows[0]!, "xyz")).toBe(false);
  });

  it("trims whitespace and matches case-insensitively (edge)", () => {
    expect(matchesNetworkSearch(rows[0]!, "  EDUCATION.JS  ")).toBe(true);
    expect(filterNetworkRowsBySearch(rows, "   ")).toEqual(rows);
    expect(matchesNetworkSearch(rows[1]!, "500")).toBe(true);
  });
});

describe("applyNetworkEvent", () => {
  function captureSlowXhr(): CaptureState {
    let state = createCaptureState();
    state = applyNetworkEvent(state, "Network.requestWillBeSent", {
      requestId: "slow",
      timestamp: 10,
      type: "XHR",
      request: { url: "https://hrms.example/api/slow", method: "POST" },
      initiator: {
        type: "script",
        stack: {
          callFrames: [
            { url: "https://hrms.example/static/js/app.js", lineNumber: 9 },
          ],
        },
      },
    });
    state = applyNetworkEvent(state, "Network.responseReceived", {
      requestId: "slow",
      type: "XHR",
      response: {
        status: 200,
        fromDiskCache: false,
        timing: {
          receiveHeadersEnd: 3800,
          sendEnd: 200,
          receiveHeadersStart: 3800,
        },
      },
    });
    return applyNetworkEvent(state, "Network.loadingFinished", {
      requestId: "slow",
      timestamp: 14.2,
    });
  }

  it("records seconds, waiting, and initiator for a finished XHR (positive)", () => {
    let state = captureSlowXhr();
    state = applyNetworkEvent(state, "Network.requestWillBeSent", {
      requestId: "fast",
      timestamp: 20,
      type: "Fetch",
      request: { url: "https://hrms.example/api/fast", method: "GET" },
      initiator: { type: "parser" },
    });
    state = applyNetworkEvent(state, "Network.loadingFinished", {
      requestId: "fast",
      timestamp: 20.3,
    });

    const rows = listCaptureRows(state);
    expect(rows.map((entry) => entry.requestId)).toEqual(["slow", "fast"]);
    expect(rows[0]).toMatchObject({
      durationSeconds: 4.2,
      waitingSeconds: 3.8,
      handlingSeconds: 3.6,
      initiatorLabel: "app.js:10",
      method: "POST",
      status: 200,
      cached: false,
    });
    expect(formatSeconds(rows[0]?.durationSeconds ?? null)).toBe("4.20");
    expect(formatSeconds(rows[0]?.waitingSeconds ?? null)).toBe("3.80");
    expect(formatSeconds(rows[0]?.handlingSeconds ?? null)).toBe("3.60");
  });

  it("marks a cached failure and ignores a finish that never started (negative)", () => {
    let state = createCaptureState();
    state = applyNetworkEvent(state, "Network.loadingFinished", {
      requestId: "ghost",
      timestamp: 5,
    });
    expect(listCaptureRows(state)).toEqual([]);

    state = applyNetworkEvent(state, "Network.requestWillBeSent", {
      requestId: "cached",
      timestamp: 1,
      type: "XHR",
      request: { url: "https://hrms.example/api/cached", method: "GET" },
      initiator: {},
    });
    state = applyNetworkEvent(state, "Network.responseReceived", {
      requestId: "cached",
      type: "XHR",
      response: { status: 200, fromDiskCache: true },
    });
    state = applyNetworkEvent(state, "Network.loadingFailed", {
      requestId: "cached",
      timestamp: 1.4,
      canceled: false,
    });

    const [cached] = listCaptureRows(state);
    expect(cached).toMatchObject({
      cached: true,
      status: "failed",
      initiatorLabel: "—",
      durationSeconds: 0.4,
    });
  });

  it("drops the oldest row past the cap and keeps the first start across a redirect (edge)", () => {
    let state = createCaptureState();
    for (let index = 0; index < MAX_CAPTURE_ROWS + 1; index += 1) {
      state = applyNetworkEvent(state, "Network.requestWillBeSent", {
        requestId: `id-${index}`,
        timestamp: index,
        type: "XHR",
        request: { url: `https://hrms.example/${index}`, method: "GET" },
      });
    }
    const rows = listCaptureRows(state);
    expect(rows).toHaveLength(MAX_CAPTURE_ROWS);
    expect(rows.some((entry) => entry.requestId === "id-0")).toBe(false);
    expect(rows.some((entry) => entry.requestId === `id-${MAX_CAPTURE_ROWS}`)).toBe(
      true,
    );

    state = applyNetworkEvent(state, "Network.requestWillBeSent", {
      requestId: `id-${MAX_CAPTURE_ROWS}`,
      timestamp: 999,
      type: "XHR",
      request: { url: "https://hrms.example/redirected", method: "GET" },
    });
    const redirected = state.byId[`id-${MAX_CAPTURE_ROWS}`];
    expect(redirected?.url).toBe("https://hrms.example/redirected");
    expect(redirected?.startedAt).toBe(MAX_CAPTURE_ROWS);
  });
});

describe("debuggerAttachErrorMessage", () => {
  it("explains a DevTools conflict without throwing (negative)", () => {
    expect(
      debuggerAttachErrorMessage(
        new Error("Another debugger is already attached to the tab with id: 3."),
      ),
    ).toBe(DEVTOOLS_ATTACHED_ERROR);
  });

  it("passes through other attach errors (edge)", () => {
    expect(debuggerAttachErrorMessage("")).toBe("Could not start network capture.");
    expect(debuggerAttachErrorMessage(new Error("Cannot access a chrome:// URL"))).toBe(
      "Cannot access a chrome:// URL",
    );
  });
});
