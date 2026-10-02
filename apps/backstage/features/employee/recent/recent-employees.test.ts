import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  loadRecentEmployees,
  readRecentEmployees,
  recentEmployeesStorageKey,
  recordRecentEmployee,
  saveRecentEmployee,
  type RecentEmployee,
} from "./recent-employees.ts";

function employee(
  employmentNumber: string,
  viewedAt: string,
  fullName = employmentNumber,
): RecentEmployee {
  return { employmentNumber, fullName, viewedAt };
}

function memoryStorage(): {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
} {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("readRecentEmployees", () => {
  it("returns nothing for empty or invalid storage", () => {
    assert.deepEqual(readRecentEmployees(null), []);
    assert.deepEqual(readRecentEmployees(""), []);
    assert.deepEqual(readRecentEmployees("not-json"), []);
    assert.deepEqual(readRecentEmployees("{}"), []);
    assert.deepEqual(
      readRecentEmployees(
        JSON.stringify([{ employmentNumber: " ", fullName: "Ada", viewedAt: "t" }]),
      ),
      [],
    );
  });

  it("keeps valid rows newest first and drops the rest", () => {
    const rows = readRecentEmployees(
      JSON.stringify([
        { employmentNumber: " 0002 ", fullName: " Bea ", viewedAt: "2026-01-01T00:00:00.000Z" },
        { fullName: "Missing number" },
        employee("0001", "2026-02-01T00:00:00.000Z", "Ada"),
        employee("0001", "2026-01-15T00:00:00.000Z", "Older Ada"),
      ]),
    );
    assert.deepEqual(rows, [
      employee("0001", "2026-02-01T00:00:00.000Z", "Ada"),
      employee("0002", "2026-01-01T00:00:00.000Z", "Bea"),
    ]);
  });
});

describe("recordRecentEmployee", () => {
  it("moves an existing employee to the front and refreshes the name", () => {
    const next = recordRecentEmployee(
      [
        employee("0002", "2026-02-01T00:00:00.000Z", "Bea"),
        employee("0001", "2026-01-01T00:00:00.000Z", "Ada"),
      ],
      { employmentNumber: "0001", fullName: "Ada Lovelace" },
      "2026-03-01T00:00:00.000Z",
    );
    assert.deepEqual(next, [
      employee("0001", "2026-03-01T00:00:00.000Z", "Ada Lovelace"),
      employee("0002", "2026-02-01T00:00:00.000Z", "Bea"),
    ]);
  });

  it("keeps the eight most recent employees", () => {
    const current = Array.from({ length: 8 }, (_, index) =>
      employee(String(index + 1), `2026-01-0${index + 1}T00:00:00.000Z`),
    );
    const next = recordRecentEmployee(
      current,
      { employmentNumber: "9", fullName: "Nine" },
      "2026-02-01T00:00:00.000Z",
    );
    assert.equal(next.length, 8);
    assert.equal(next[0]?.employmentNumber, "9");
    assert.equal(next.some((row) => row.employmentNumber === "8"), false);
  });

  it("leaves the list unchanged when the employee is blank", () => {
    const current = [employee("0001", "2026-01-01T00:00:00.000Z", "Ada")];
    assert.deepEqual(
      recordRecentEmployee(current, { employmentNumber: " ", fullName: "Ada" }, "t"),
      current,
    );
    assert.deepEqual(
      recordRecentEmployee(current, { employmentNumber: "0002", fullName: " " }, "t"),
      current,
    );
  });
});

describe("saveRecentEmployee", () => {
  it("keeps each employer's list separate", () => {
    const storage = memoryStorage();
    saveRecentEmployee(
      storage,
      1,
      { employmentNumber: "0001", fullName: "Ada" },
      "2026-01-01T00:00:00.000Z",
    );
    saveRecentEmployee(
      storage,
      2,
      { employmentNumber: "0009", fullName: "Bea" },
      "2026-01-02T00:00:00.000Z",
    );

    assert.notEqual(recentEmployeesStorageKey(1), recentEmployeesStorageKey(2));
    assert.deepEqual(
      loadRecentEmployees(storage, 1).map((row) => row.employmentNumber),
      ["0001"],
    );
    assert.deepEqual(
      loadRecentEmployees(storage, 2).map((row) => row.employmentNumber),
      ["0009"],
    );
  });
});
