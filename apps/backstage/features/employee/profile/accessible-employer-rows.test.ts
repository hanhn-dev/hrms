import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { accessibleEmployerRows } from "./accessible-employer-rows.ts";

describe("accessibleEmployerRows", () => {
  it("marks the current employer applied and lists it first", () => {
    assert.deepEqual(
      accessibleEmployerRows(
        [
          { employerId: 30, employerName: "Cedar" },
          { employerId: 10, employerName: "Alder" },
          { employerId: 20, employerName: "Birch" },
        ],
        20,
      ),
      [
        { employerId: 20, label: "Birch", applied: true },
        { employerId: 10, label: "Alder", applied: false },
        { employerId: 30, label: "Cedar", applied: false },
      ],
    );
  });

  it("marks none applied when the current employer is not in the list", () => {
    assert.deepEqual(
      accessibleEmployerRows(
        [
          { employerId: 30, employerName: "Cedar" },
          { employerId: 10, employerName: "Alder" },
        ],
        99,
      ),
      [
        { employerId: 10, label: "Alder", applied: false },
        { employerId: 30, label: "Cedar", applied: false },
      ],
    );
  });

  it("shows the id when the employer has no name", () => {
    assert.deepEqual(
      accessibleEmployerRows(
        [
          { employerId: 15, employerName: "   " },
          { employerId: 4, employerName: null },
        ],
        4,
      ),
      [
        { employerId: 4, label: "4", applied: true },
        { employerId: 15, label: "15", applied: false },
      ],
    );
  });
});
