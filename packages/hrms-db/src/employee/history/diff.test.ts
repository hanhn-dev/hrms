import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareTimeStampDesc,
  resolveHistoryDateWindow,
} from "./dates.ts";
import {
  diffSnapshotSeries,
  groupFieldChangesIntoEvents,
  snapshotsToEvents,
} from "./diff.ts";
import type { HistoryEditor, HistorySnapshot } from "./types.ts";

describe("resolveHistoryDateWindow", () => {
  it("defaults to unbounded when dates are empty (positive)", () => {
    const now = new Date("2026-09-29T12:00:00.000Z");
    const window = resolveHistoryDateWindow({ now });
    assert.equal(window.bounded, false);
    assert.equal(window.from, null);
    assert.equal(window.toExclusive, null);
  });

  it("rejects inverted ranges by clamping from (negative)", () => {
    const window = resolveHistoryDateWindow({
      from: "2026-09-29",
      to: "2026-09-01",
      now: new Date("2026-09-29T00:00:00.000Z"),
    });
    assert.equal(window.bounded, true);
    assert.ok(window.from!.getTime() < window.toExclusive!.getTime());
  });

  it("caps an explicit span to max lookback (edge)", () => {
    const window = resolveHistoryDateWindow({
      from: "2020-01-01",
      to: "2026-09-29",
      now: new Date("2026-09-29T00:00:00.000Z"),
      maxLookbackDays: 365,
    });
    assert.equal(window.bounded, true);
    const days =
      (window.toExclusive!.getTime() - window.from!.getTime()) / (24 * 60 * 60 * 1000);
    assert.ok(days <= 366);
  });
});

describe("diffSnapshotSeries", () => {
  it("emits MODIFIED when a field changes (positive)", () => {
    const snapshots: HistorySnapshot[] = [
      {
        entityKey: "1",
        timeStamp: "2026-01-01T00:00:00.000Z",
        historyId: 1,
        editorEmployeeId: 10,
        isDeleted: false,
        values: { FName: "Ada" },
      },
      {
        entityKey: "1",
        timeStamp: "2026-02-01T00:00:00.000Z",
        historyId: 2,
        editorEmployeeId: 11,
        isDeleted: false,
        values: { FName: "Ada Lovelace" },
      },
    ];
    const rows = diffSnapshotSeries(snapshots, { FName: "First Name" }, ["FName"]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.change.changeType, "ADDED");
    assert.equal(rows[1]?.change.changeType, "MODIFIED");
    assert.equal(rows[1]?.change.oldValue, "Ada");
    assert.equal(rows[1]?.change.newValue, "Ada Lovelace");
  });

  it("skips unchanged fields (negative)", () => {
    const snapshots: HistorySnapshot[] = [
      {
        entityKey: "1",
        timeStamp: "2026-01-01T00:00:00.000Z",
        historyId: 1,
        editorEmployeeId: 10,
        isDeleted: false,
        values: { FName: "Ada", LName: "Lovelace" },
      },
      {
        entityKey: "1",
        timeStamp: "2026-02-01T00:00:00.000Z",
        historyId: 2,
        editorEmployeeId: 10,
        isDeleted: false,
        values: { FName: "Ada", LName: "Byron" },
      },
    ];
    const rows = diffSnapshotSeries(
      snapshots,
      { FName: "First Name", LName: "Last Name" },
      ["FName", "LName"],
    );
    assert.equal(rows.filter((row) => row.change.field === "First Name").length, 1);
    assert.equal(
      rows.filter((row) => row.change.field === "Last Name" && row.change.changeType === "MODIFIED")
        .length,
      1,
    );
  });

  it("emits REMOVED when an entity is soft-deleted (edge)", () => {
    const snapshots: HistorySnapshot[] = [
      {
        entityKey: "9",
        timeStamp: "2026-01-01T00:00:00.000Z",
        historyId: 1,
        editorEmployeeId: 10,
        isDeleted: false,
        values: { BankName: "HSBC" },
      },
      {
        entityKey: "9",
        timeStamp: "2026-03-01T00:00:00.000Z",
        historyId: 2,
        editorEmployeeId: 10,
        isDeleted: true,
        values: { BankName: "HSBC" },
      },
    ];
    const rows = diffSnapshotSeries(snapshots, { BankName: "Bank Name" }, ["BankName"]);
    const removed = rows.filter((row) => row.change.changeType === "REMOVED");
    assert.ok(removed.length >= 1);
  });

  it("skips emitEvent=false baselines and orders by seriesOrder (My Details null UTC)", () => {
    const snapshots: HistorySnapshot[] = [
      {
        entityKey: "1",
        timeStamp: "1970-01-01T00:00:00.000Z",
        historyId: 100,
        seriesOrder: 100,
        emitEvent: false,
        editorEmployeeId: 10,
        isDeleted: false,
        values: { Title: "Old" },
      },
      {
        entityKey: "1",
        timeStamp: "2025-04-23T06:24:32.000Z",
        historyId: 50,
        seriesOrder: 50,
        emitEvent: true,
        editorEmployeeId: 10,
        isDeleted: false,
        values: { Title: "Mid" },
      },
      {
        entityKey: "1",
        // Live ModifiedDate would be Aug 2026 — must not emit without UTC.
        timeStamp: "1970-01-01T00:00:00.000Z",
        historyId: 2_000_000_000,
        seriesOrder: 2_000_000_000,
        emitEvent: false,
        editorEmployeeId: 10,
        isDeleted: false,
        values: { Title: "New" },
      },
    ];
    const rows = diffSnapshotSeries(snapshots, { Title: "Designation" }, ["Title"]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.timeStamp, "2025-04-23T06:24:32.000Z");
    assert.equal(rows[0]?.change.oldValue, "NOT SET");
    assert.equal(rows[0]?.change.newValue, "Mid");
  });
  it("emits empty ADDED fields on the first snapshot (My Details parity)", () => {
    const snapshots: HistorySnapshot[] = [
      {
        entityKey: "1",
        timeStamp: "2021-02-12T09:50:48.000Z",
        historyId: 1,
        editorEmployeeId: 10,
        isDeleted: false,
        values: { FName: "Harsh", MiddleName: "", Gender: "" },
      },
    ];
    const rows = diffSnapshotSeries(
      snapshots,
      { FName: "First Name", MiddleName: "Middle Name", Gender: "Gender" },
      ["FName", "MiddleName", "Gender"],
    );
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.change.changeType === "ADDED"));
    assert.equal(rows.find((r) => r.change.field === "Middle Name")?.change.newValue, "");
    assert.equal(rows.find((r) => r.change.field === "First Name")?.change.newValue, "Harsh");
  });
});

describe("groupFieldChangesIntoEvents", () => {
  it("groups by timestamp + editor + section", () => {
    const editors = new Map<number, HistoryEditor>([
      [10, { employeeId: 10, name: "Pat Editor", employmentNumber: "E10" }],
    ]);
    const events = groupFieldChangesIntoEvents(
      "Personal Details",
      [
        {
          timeStamp: "2026-02-01T00:00:00.000Z",
          editorEmployeeId: 10,
          change: {
            field: "First Name",
            oldValue: "A",
            newValue: "B",
            changeType: "MODIFIED",
          },
        },
        {
          timeStamp: "2026-02-01T00:00:00.000Z",
          editorEmployeeId: 10,
          change: {
            field: "Last Name",
            oldValue: "C",
            newValue: "D",
            changeType: "MODIFIED",
          },
        },
      ],
      editors,
    );
    assert.equal(events.length, 1);
    assert.equal(events[0]?.editor.id, "E10");
    assert.equal(events[0]?.changes.length, 2);
  });
});

describe("snapshotsToEvents + sort", () => {
  it("orders events by timestamp DESC after merge", () => {
    const editors = new Map<number, HistoryEditor>([
      [1, { employeeId: 1, name: "A", employmentNumber: "1" }],
    ]);
    const early = snapshotsToEvents(
      "Bank Details",
      [
        {
          entityKey: "1",
          timeStamp: "2026-01-01T00:00:00.000Z",
          historyId: 1,
          editorEmployeeId: 1,
          isDeleted: false,
          values: { BankName: "A" },
        },
      ],
      { BankName: "Bank Name" },
      ["BankName"],
      editors,
    );
    const late = snapshotsToEvents(
      "Personal Details",
      [
        {
          entityKey: "1",
          timeStamp: "2026-08-01T00:00:00.000Z",
          historyId: 1,
          editorEmployeeId: 1,
          isDeleted: false,
          values: { FName: "Z" },
        },
      ],
      { FName: "First Name" },
      ["FName"],
      editors,
    );
    const merged = [...early, ...late].sort((a, b) =>
      compareTimeStampDesc(a.timeStamp, b.timeStamp),
    );
    assert.equal(merged[0]?.section, "Personal Details");
    assert.equal(merged[1]?.section, "Bank Details");
  });
});
