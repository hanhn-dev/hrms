import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  histogramBins,
  kernelDensity,
  packCircles,
  placeWords,
  quartiles,
  sankeyLayout,
  squarify,
  sunburstArcs,
  vennLayout,
} from "@/shared/charts/layout";

describe("histogramBins", () => {
  it("keeps bins contiguous and counts every finite number", () => {
    const bins = histogramBins([1, 2, 3, 4, Number.NaN], 2);
    assert.equal(bins.length, 2);
    assert.equal(bins[0]?.end, bins[1]?.start);
    assert.equal((bins[0]?.count ?? 0) + (bins[1]?.count ?? 0), 4);
  });
});

describe("quartiles", () => {
  it("matches the linear percentile of 1 through 9", () => {
    assert.deepEqual(quartiles([9, 1, 5, 3, 7, 2, 8, 4, 6]), {
      min: 1,
      q1: 3,
      median: 5,
      q3: 7,
      max: 9,
    });
  });
});

describe("kernelDensity", () => {
  it("is symmetric for a symmetric sample", () => {
    const points = kernelDensity([-2, -1, 0, 1, 2], 21);
    const left = points[4];
    const right = points[16];
    assert.ok(left && right);
    assert.ok(Math.abs(left.y - right.y) < 1e-9);
  });
});

describe("squarify", () => {
  it("tiles the parent rectangle", () => {
    const rects = squarify([1, 1, 1, 1], { x: 0, y: 0, width: 100, height: 50 });
    const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    assert.ok(Math.abs(area - 5000) < 1);
    for (const rect of rects) {
      assert.ok(rect.x >= -0.01);
      assert.ok(rect.y >= -0.01);
      assert.ok(rect.x + rect.width <= 100.01);
      assert.ok(rect.y + rect.height <= 50.01);
    }
  });
});

describe("sankeyLayout", () => {
  it("makes outgoing link widths sum to the source node height", () => {
    const layout = sankeyLayout(
      [
        { source: "A", target: "B", value: 2 },
        { source: "A", target: "C", value: 3 },
      ],
      { width: 240, height: 120 },
    );
    const source = layout.nodes.find((node) => node.id === "A");
    assert.ok(source);
    assert.equal(source.value, 5);
    const width = layout.links
      .filter((link) => link.source === "A")
      .reduce((sum, link) => sum + link.width, 0);
    assert.ok(Math.abs(width - source.height) < 0.01);
  });
});

describe("sunburstArcs", () => {
  it("gives the first ring a full circle", () => {
    const arcs = sunburstArcs({
      name: "root",
      children: [
        { name: "a", value: 1 },
        { name: "b", value: 1 },
        { name: "c", value: 2 },
      ],
    });
    const sweep = arcs
      .filter((arc) => arc.depth === 1)
      .reduce((sum, arc) => sum + (arc.end - arc.start), 0);
    assert.ok(Math.abs(sweep - Math.PI * 2) < 1e-9);
  });
});

describe("packCircles", () => {
  it("keeps packed circles inside the root", () => {
    const circles = packCircles(
      {
        name: "root",
        children: [
          { name: "a", value: 4 },
          { name: "b", value: 1 },
          {
            name: "c",
            children: [
              { name: "c1", value: 2 },
              { name: "c2", value: 2 },
            ],
          },
        ],
      },
      100,
    );
    for (const circle of circles) {
      assert.ok(Math.hypot(circle.cx, circle.cy) + circle.r <= 100.5);
    }
  });
});

describe("vennLayout", () => {
  it("rejects four sets", () => {
    assert.deepEqual(
      vennLayout([
        { sets: ["a"], size: 10 },
        { sets: ["b"], size: 8 },
        { sets: ["c"], size: 6 },
        { sets: ["d"], size: 4 },
      ]),
      { ok: false, reason: "too-many-sets" },
    );
  });
});

describe("placeWords", () => {
  it("skips a box that would overlap an earlier word", () => {
    const placed = placeWords(
      [
        { text: "alpha", width: 80, height: 40 },
        { text: "beta", width: 80, height: 40 },
      ],
      { width: 100, height: 60 },
    );
    assert.equal(placed[0]?.placed, true);
    assert.equal(placed[1]?.placed, false);
  });
});
