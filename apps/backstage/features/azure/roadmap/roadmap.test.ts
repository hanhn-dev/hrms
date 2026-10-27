import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "vitest";
import { readRoadmap, writeRoadmap } from "./roadmap-store.ts";
import {
  barPercent,
  createItem,
  datesInMonth,
  createWindow,
  emptyRoadmap,
  ensureLaneColors,
  fitRange,
  hideSprintItem,
  itemRange,
  LANE_COLORS,
  mergeSprintLayout,
  nextLaneColor,
  orderedWindows,
  placeItem,
  placeSprintItem,
  resizeEdge,
  RoadmapSchema,
  saveSprintLayout,
  scheduleItem,
  scheduleSprintItem,
  timelineMonths,
  updateWindow,
  type Roadmap,
} from "./roadmap.ts";

const WINDOW_A = "11111111-1111-4111-8111-111111111111";
const WINDOW_B = "22222222-2222-4222-8222-222222222222";
const ITEM_FIRST = "33333333-3333-4333-8333-333333333333";
const ITEM_SECOND = "44444444-4444-4444-8444-444444444444";
const ITEM_THIRD = "55555555-5555-4555-8555-555555555555";
const SPRINT_ID = "sprint-61";
const SPRINT_BOUNDS = { startsOn: "2026-10-21", endsOn: "2026-11-03" };

const roots: string[] = [];

function tempFile(): string {
  const root = mkdtempSync(path.join(tmpdir(), "roadmap-"));
  roots.push(root);
  return path.join(root, "roadmap.json");
}

function twoItems(): Roadmap {
  const withWindow = createWindow(
    emptyRoadmap(),
    { name: "Release A", startsOn: "2026-01-01", endsOn: "2026-03-31" },
    WINDOW_A,
  );
  const withFirst = createItem(
    withWindow,
    WINDOW_A,
    { workItemId: 170434, title: "Login" },
    ITEM_FIRST,
  );
  return createItem(withFirst, WINDOW_A, { workItemId: 171688, title: "Search" }, ITEM_SECOND);
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("roadmap store", () => {
  it("returns an empty roadmap when the file is missing", () => {
    const file = tempFile();
    assert.deepEqual(readRoadmap(file), { windows: [], sprintLayouts: [] });
  });

  it("rejects a window whose end is before its start", () => {
    assert.throws(
      () =>
        createWindow(emptyRoadmap(), {
          name: "Broken",
          startsOn: "2026-04-01",
          endsOn: "2026-03-01",
        }),
      /End date must be on or after the start date/,
    );
  });

  it("rejects a work item that belongs to two windows", () => {
    const result = RoadmapSchema.safeParse({
      windows: [
        {
          id: WINDOW_A,
          name: "A",
          startsOn: "2026-01-01",
          endsOn: "2026-01-31",
          items: [{ id: ITEM_FIRST, workItemId: 170434, title: "Login", rank: 1 }],
        },
        {
          id: WINDOW_B,
          name: "B",
          startsOn: "2026-02-01",
          endsOn: "2026-02-28",
          items: [{ id: ITEM_SECOND, workItemId: 170434, title: "Login", rank: 1 }],
        },
      ],
    });
    assert.equal(result.success, false);
  });

  it("drops a work item onto the first row so rank 1 is the one to implement first", () => {
    const roadmap = twoItems();
    const moved = placeItem(roadmap, ITEM_SECOND, WINDOW_A, 0);
    const items = orderedWindows(moved)[0]?.items ?? [];
    assert.equal(items[0]?.id, ITEM_SECOND);
    assert.equal(items[0]?.rank, 1);
    assert.equal(items[1]?.id, ITEM_FIRST);
    assert.equal(items[1]?.rank, 2);
    const held = placeItem(moved, ITEM_SECOND, WINDOW_A, 0);
    assert.equal(orderedWindows(held)[0]?.items[0]?.id, ITEM_SECOND);
  });

  it("keeps a moved work item in only the destination window", () => {
    const withSecond = createWindow(
      twoItems(),
      { name: "Release B", startsOn: "2026-04-01", endsOn: "2026-06-30" },
      WINDOW_B,
    );
    const moved = placeItem(withSecond, ITEM_SECOND, WINDOW_B, 0);
    const windows = orderedWindows(moved);
    assert.deepEqual(
      windows[0]?.items.map((item) => item.id),
      [ITEM_FIRST],
    );
    assert.equal(windows[0]?.items[0]?.rank, 1);
    assert.deepEqual(
      windows[1]?.items.map((item) => item.id),
      [ITEM_SECOND],
    );
    assert.equal(windows[1]?.items[0]?.rank, 1);
  });

  it("writes and reads a roadmap", () => {
    const file = tempFile();
    const roadmap = twoItems();
    writeRoadmap(roadmap, file);
    assert.deepEqual(readRoadmap(file), roadmap);
  });

  it("rejects a corrupt roadmap file", () => {
    const file = tempFile();
    writeFileSync(file, "{", "utf8");
    assert.throws(() => readRoadmap(file), /Roadmap file is not valid JSON/);
  });

  it("reads a saved id that was stored as the title", () => {
    const file = tempFile();
    writeFileSync(
      file,
      `${JSON.stringify({
        windows: [
          {
            id: WINDOW_A,
            name: "Sep - Dec",
            startsOn: "2026-09-01",
            endsOn: "2026-12-31",
            items: [{ id: ITEM_FIRST, title: "170434", rank: 1 }],
          },
        ],
      })}\n`,
      "utf8",
    );
    const roadmap = readRoadmap(file);
    assert.equal(roadmap.windows[0]?.items[0]?.workItemId, 170434);
    assert.equal(roadmap.windows[0]?.items[0]?.title, "170434");
  });

  it("lays months across the earliest and latest time frames", () => {
    const axis = timelineMonths([
      { startsOn: "2026-09-01", endsOn: "2026-12-31" },
      { startsOn: "2027-01-01", endsOn: "2027-02-28" },
    ]);
    assert.deepEqual(
      axis?.months.map((month) => month.label),
      ["Sep 2026", "Oct 2026", "Nov 2026", "Dec 2026", "Jan 2027", "Feb 2027"],
    );
    assert.equal(axis?.start, "2026-09-01");
    assert.equal(axis?.end, "2027-03-01");
    assert.equal(axis?.months[0]?.startsOn, "2026-09-01");
    assert.equal(axis?.months[0]?.endsOn, "2026-09-30");
    assert.equal(axis?.months[0]?.days, 30);
    assert.equal(axis?.months[1]?.days, 31);
    assert.equal(axis?.months[5]?.startsOn, "2027-02-01");
    assert.equal(axis?.months[5]?.endsOn, "2027-02-28");
    assert.equal(axis?.months[5]?.days, 28);
    const september = datesInMonth(axis?.months[0] ?? { key: "", days: 0 });
    assert.equal(september.length, 30);
    assert.equal(september[0], "2026-09-01");
    assert.equal(september.at(-1), "2026-09-30");
    const span = barPercent("2026-09-01", "2026-12-31", axis?.start ?? "", axis?.end ?? "");
    assert.ok(span.left < 1);
    assert.ok(span.width > 50);
    assert.ok(span.width < 80);
  });

  it("stretches the axis to a work item dated before its sprint", () => {
    const axis = timelineMonths([
      {
        startsOn: "2026-10-21",
        endsOn: "2026-11-03",
        items: [{ startsOn: "2026-05-12", endsOn: "2026-06-19" }],
      },
    ]);
    assert.equal(axis?.months[0]?.startsOn, "2026-05-01");
    assert.equal(axis?.months[0]?.endsOn, "2026-05-31");
    assert.equal(axis?.months[0]?.days, 31);
    assert.equal(axis?.start, "2026-05-01");
    assert.equal(axis?.months.at(-1)?.key, "2026-11");
  });

  it("gives each time frame its own color and keeps that color", () => {
    const first = createWindow(
      emptyRoadmap(),
      { name: "Release A", startsOn: "2026-01-01", endsOn: "2026-01-31" },
      WINDOW_A,
    );
    const second = createWindow(
      first,
      { name: "Release B", startsOn: "2026-02-01", endsOn: "2026-02-28" },
      WINDOW_B,
    );
    const colorA = second.windows.find((window) => window.id === WINDOW_A)?.color;
    const colorB = second.windows.find((window) => window.id === WINDOW_B)?.color;
    assert.equal(colorA, LANE_COLORS[0]);
    assert.equal(colorB, LANE_COLORS[1]);
    assert.notEqual(colorA, colorB);
    const filled = ensureLaneColors({
      windows: [
        {
          id: WINDOW_A,
          name: "Release A",
          startsOn: "2026-01-01",
          endsOn: "2026-01-31",
          items: [],
        },
      ],
      sprintLayouts: [{ sprintId: SPRINT_ID, hiddenWorkItemIds: [], items: [] }],
    });
    assert.equal(filled.changed, true);
    assert.notEqual(filled.roadmap.windows[0]?.color, filled.roadmap.sprintLayouts[0]?.color);
    const kept = ensureLaneColors(filled.roadmap);
    assert.equal(kept.changed, false);
    assert.equal(kept.roadmap.windows[0]?.color, filled.roadmap.windows[0]?.color);
    const duplicate = ensureLaneColors({
      windows: [
        {
          id: WINDOW_A,
          name: "Release A",
          startsOn: "2026-01-01",
          endsOn: "2026-01-31",
          color: "#7c3aed",
          items: [],
        },
      ],
      sprintLayouts: [
        { sprintId: SPRINT_ID, color: "#7c3aed", hiddenWorkItemIds: [], items: [] },
      ],
    });
    assert.equal(duplicate.changed, true);
    assert.equal(duplicate.roadmap.windows[0]?.color, "#7c3aed");
    assert.notEqual(duplicate.roadmap.sprintLayouts[0]?.color, "#7c3aed");
    const used = LANE_COLORS.map((color) => color);
    const extra = nextLaneColor(used);
    assert.equal(used.includes(extra as (typeof LANE_COLORS)[number]), false);
    assert.notEqual(extra, nextLaneColor([...used, extra]));
  });
});

describe("work item dates", () => {
  it("uses the time frame when a work item has no dates of its own", () => {
    const item = twoItems().windows[0]?.items[0];
    assert.ok(item);
    assert.deepEqual(itemRange(item, { startsOn: "2026-09-01", endsOn: "2026-12-31" }), {
      startsOn: "2026-09-01",
      endsOn: "2026-12-31",
    });
  });

  it("saves a start and end inside the time frame", () => {
    const saved = scheduleItem(twoItems(), ITEM_FIRST, "2026-01-15", "2026-02-28");
    const item = saved.windows[0]?.items.find((candidate) => candidate.id === ITEM_FIRST);
    assert.equal(item?.startsOn, "2026-01-15");
    assert.equal(item?.endsOn, "2026-02-28");
  });

  it("rejects dates outside the time frame", () => {
    assert.throws(
      () => scheduleItem(twoItems(), ITEM_FIRST, "2026-08-01", "2026-10-01"),
      /Work item dates must stay inside the time frame/,
    );
  });

  it("rejects an end date before the start date", () => {
    assert.throws(
      () => scheduleItem(twoItems(), ITEM_FIRST, "2026-02-10", "2026-02-01"),
      /End date must be on or after the start date/,
    );
  });

  it("resizes an edge and keeps the bar inside the time frame", () => {
    assert.deepEqual(
      resizeEdge("2026-09-01", "2026-10-15", "end", 20, "2026-09-01", "2026-12-31"),
      { startsOn: "2026-09-01", endsOn: "2026-11-04" },
    );
    assert.deepEqual(
      resizeEdge("2026-09-10", "2026-10-01", "start", -30, "2026-09-01", "2026-12-31"),
      { startsOn: "2026-09-01", endsOn: "2026-10-01" },
    );
    assert.deepEqual(
      resizeEdge("2026-09-10", "2026-10-01", "end", -40, "2026-09-01", "2026-12-31"),
      { startsOn: "2026-09-10", endsOn: "2026-09-10" },
    );
  });

  it("slides a bar so its length stays inside the time frame", () => {
    assert.deepEqual(fitRange("2026-08-01", "2026-08-14", "2026-09-01", "2026-12-31"), {
      startsOn: "2026-09-01",
      endsOn: "2026-09-14",
    });
    assert.deepEqual(fitRange("2026-12-20", "2027-01-02", "2026-09-01", "2026-12-31"), {
      startsOn: "2026-12-18",
      endsOn: "2026-12-31",
    });
    assert.deepEqual(fitRange("2026-01-01", "2026-06-01", "2026-09-01", "2026-12-31"), {
      startsOn: "2026-09-01",
      endsOn: "2026-12-31",
    });
  });

  it("clamps custom dates when the time frame shrinks and leaves unset dates unset", () => {
    const dated = scheduleItem(twoItems(), ITEM_FIRST, "2026-01-10", "2026-03-20");
    const updated = updateWindow(dated, WINDOW_A, {
      name: "Release A",
      startsOn: "2026-02-01",
      endsOn: "2026-02-28",
    });
    const first = updated.windows[0]?.items.find((item) => item.id === ITEM_FIRST);
    const second = updated.windows[0]?.items.find((item) => item.id === ITEM_SECOND);
    assert.equal(first?.startsOn, "2026-02-01");
    assert.equal(first?.endsOn, "2026-02-28");
    assert.equal(second?.startsOn, undefined);
    assert.equal(second?.endsOn, undefined);
  });

  it("saves dates when a bar is dropped on its own row", () => {
    const moved = placeItem(twoItems(), ITEM_FIRST, WINDOW_A, 0, {
      startsOn: "2026-02-01",
      endsOn: "2026-02-14",
    });
    const item = moved.windows[0]?.items.find((candidate) => candidate.id === ITEM_FIRST);
    assert.equal(item?.rank, 1);
    assert.equal(item?.startsOn, "2026-02-01");
    assert.equal(item?.endsOn, "2026-02-14");
  });
});

describe("sprint layout", () => {
  const parents = [
    { id: 142316, title: "Admin Configuration" },
    { id: 145158, title: "Add Date Picker" },
  ];

  function layoutWithItems(): Roadmap {
    const ids = [ITEM_FIRST, ITEM_SECOND];
    let index = 0;
    const merged = mergeSprintLayout(undefined, SPRINT_ID, parents, SPRINT_BOUNDS, () => {
      const id = ids[index] ?? ITEM_THIRD;
      index += 1;
      return id;
    });
    return saveSprintLayout(emptyRoadmap(), merged.layout);
  }

  it("appends new parents in id order with no dates so they span the sprint", () => {
    let nextId = ITEM_FIRST;
    const merged = mergeSprintLayout(undefined, SPRINT_ID, parents, SPRINT_BOUNDS, () => {
      const id = nextId;
      nextId = ITEM_SECOND;
      return id;
    });
    assert.equal(merged.changed, true);
    assert.deepEqual(
      merged.layout.items.map((item) => ({
        id: item.id,
        workItemId: item.workItemId,
        rank: item.rank,
        startsOn: item.startsOn,
      })),
      [
        { id: ITEM_FIRST, workItemId: 142316, rank: 1, startsOn: undefined },
        { id: ITEM_SECOND, workItemId: 145158, rank: 2, startsOn: undefined },
      ],
    );
  });

  it("keeps saved rank and dates that fall outside the sprint", () => {
    const saved = layoutWithItems().sprintLayouts[0];
    assert.ok(saved);
    const dated = {
      ...saved,
      items: saved.items.map((item) =>
        item.workItemId === 145158
          ? { ...item, startsOn: "2026-10-01", endsOn: "2026-11-20" }
          : item,
      ),
    };
    const merged = mergeSprintLayout(
      dated,
      SPRINT_ID,
      [...parents, { id: 152413, title: "Education Details" }],
      SPRINT_BOUNDS,
      () => ITEM_THIRD,
    );
    assert.equal(merged.changed, true);
    assert.equal(merged.layout.items[0]?.workItemId, 142316);
    assert.equal(merged.layout.items[1]?.workItemId, 145158);
    assert.equal(merged.layout.items[1]?.startsOn, "2026-10-01");
    assert.equal(merged.layout.items[1]?.endsOn, "2026-11-20");
    assert.equal(merged.layout.items[2]?.workItemId, 152413);
    assert.equal(merged.layout.items[2]?.startsOn, undefined);
  });

  it("stores each parent's work item type and keeps it when Azure still reports it", () => {
    let nextId = ITEM_FIRST;
    const merged = mergeSprintLayout(
      undefined,
      SPRINT_ID,
      [
        { id: 142316, title: "Admin Configuration", type: "Product Backlog Item" },
        { id: 12, title: "Defect", type: "Bug" },
      ],
      SPRINT_BOUNDS,
      () => {
        const id = nextId;
        nextId = ITEM_SECOND;
        return id;
      },
    );
    assert.equal(merged.layout.items[0]?.workItemId, 12);
    assert.equal(merged.layout.items[0]?.type, "Bug");
    assert.equal(merged.layout.items[1]?.type, "Product Backlog Item");
    const again = mergeSprintLayout(merged.layout, SPRINT_ID, [
      { id: 142316, title: "Admin Configuration", type: "Product Backlog Item" },
      { id: 12, title: "Defect", type: "Task" },
    ], SPRINT_BOUNDS);
    assert.equal(again.changed, true);
    assert.equal(again.layout.items[0]?.type, "Task");
    assert.equal(again.layout.items[1]?.type, "Product Backlog Item");
  });

  it("does not bring back a work item hidden in Backstage", () => {
    const roadmap = hideSprintItem(layoutWithItems(), ITEM_FIRST);
    const saved = roadmap.sprintLayouts[0];
    const merged = mergeSprintLayout(saved, SPRINT_ID, parents, SPRINT_BOUNDS, () => ITEM_THIRD);
    assert.deepEqual(
      merged.layout.items.map((item) => item.workItemId),
      [145158],
    );
    assert.deepEqual(merged.layout.hiddenWorkItemIds, [142316]);
    assert.equal(merged.changed, false);
  });

  it("saves sprint dates in Backstage, including dates outside the sprint", () => {
    const saved = scheduleSprintItem(layoutWithItems(), ITEM_SECOND, "2026-05-12", "2026-06-19", SPRINT_BOUNDS);
    const item = saved.sprintLayouts[0]?.items.find((candidate) => candidate.id === ITEM_SECOND);
    assert.equal(item?.startsOn, "2026-05-12");
    assert.equal(item?.endsOn, "2026-06-19");
    assert.equal(saved.windows.length, 0);
    assert.throws(
      () => scheduleSprintItem(saved, ITEM_SECOND, "2026-10-28", "2026-10-01", SPRINT_BOUNDS),
      /End date must be on or after the start date/,
    );
  });

  it("reorders priority inside the sprint and refuses another sprint", () => {
    const moved = placeSprintItem(layoutWithItems(), ITEM_SECOND, SPRINT_ID, 0, SPRINT_BOUNDS);
    assert.deepEqual(
      moved.sprintLayouts[0]?.items.map((item) => item.workItemId),
      [145158, 142316],
    );
    assert.deepEqual(
      moved.sprintLayouts[0]?.items.map((item) => item.rank),
      [1, 2],
    );
    assert.throws(
      () => placeSprintItem(moved, ITEM_SECOND, "other-sprint", 0, SPRINT_BOUNDS),
      /Work items stay in their sprint/,
    );
  });
});
