import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupFieldChangesIntoEvents } from "./diff.ts";
import type { HistoryEditor } from "./types.ts";

describe("bank-style REMOVED aggregation", () => {
  it("groups all removed fields into one event with the editor (positive)", () => {
    const editors = new Map<number, HistoryEditor>([
      [1435, { employeeId: 1435, name: "FARLEY MCQUEARY", employmentNumber: "00006" }],
    ]);
    const timeStamp = "2026-09-29T02:09:09.333Z";
    const events = groupFieldChangesIntoEvents(
      "Bank Details",
      [
        {
          timeStamp,
          editorEmployeeId: 1435,
          change: {
            field: "Account Number",
            oldValue: "6738790457",
            newValue: "NOT SET",
            changeType: "REMOVED",
          },
        },
        {
          timeStamp,
          editorEmployeeId: 1435,
          change: {
            field: "Bank Name",
            oldValue: "ICICI Bank",
            newValue: "NOT SET",
            changeType: "REMOVED",
          },
        },
      ],
      editors,
    );
    assert.equal(events.length, 1);
    assert.equal(events[0]?.editor.name, "FARLEY MCQUEARY");
    assert.equal(events[0]?.editor.id, "00006");
    assert.equal(events[0]?.changes.length, 2);
    assert.equal(events[0]?.section, "Bank Details");
  });

  it("keeps MODIFIED Default No→Yes as its own event (edge)", () => {
    const editors = new Map<number, HistoryEditor>([
      [1431, { employeeId: 1431, name: "aabb", employmentNumber: "x" }],
    ]);
    const events = groupFieldChangesIntoEvents(
      "Bank Details",
      [
        {
          timeStamp: "2026-05-22T07:17:27.300Z",
          editorEmployeeId: 1431,
          change: {
            field: "Default",
            oldValue: "No",
            newValue: "Yes",
            changeType: "MODIFIED",
          },
        },
      ],
      editors,
    );
    assert.equal(events.length, 1);
    assert.equal(events[0]?.changes[0]?.oldValue, "No");
    assert.equal(events[0]?.changes[0]?.newValue, "Yes");
  });
});
