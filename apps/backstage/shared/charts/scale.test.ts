import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { columnMarks, markBelowBaseline } from "@/shared/charts/bar-geometry";
import { linearScale, pieSlices } from "@/shared/charts/scale";

describe("linearScale", () => {
  it("includes 0 and covers the data max", () => {
    const scale = linearScale([3, 8]);
    assert.ok(scale.ticks.includes(0));
    assert.ok(scale.max >= 8);
  });

  it("places negative values below the baseline", () => {
    const scale = linearScale([-4, 6]);
    assert.ok(scale.unit(-4) < scale.unit(0));
    const marks = columnMarks({
      categories: ["A"],
      series: [{ name: "S", values: [-4] }],
      stacked: false,
    });
    const mark = marks[0];
    assert.ok(mark);
    assert.equal(markBelowBaseline(mark, scale), true);
  });

  it("returns an empty scale for empty input", () => {
    const scale = linearScale([]);
    assert.deepEqual(scale.ticks, []);
    assert.equal(scale.unit(5), 0);
  });
});

describe("pieSlices", () => {
  it("sums to a full circle and drops a zero total", () => {
    const slices = pieSlices([1, 3, 0]);
    const sweep = slices.reduce((sum, slice) => sum + (slice.end - slice.start), 0);
    assert.ok(Math.abs(sweep - Math.PI * 2) < 1e-9);
    assert.deepEqual(pieSlices([0, 0]), []);
  });
});
