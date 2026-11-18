import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { placeExpandedNodes } from "@/features/dbs/canvas/place-expanded-nodes";

describe("placeExpandedNodes", () => {
  const anchor = { id: "dbo.TEmployee", position: { x: 100, y: 100 } };

  it("skips ids that are already on the canvas", () => {
    const placed = placeExpandedNodes(
      anchor,
      ["dbo.TEmployer", "dbo.TStatus"],
      [
        anchor,
        { id: "dbo.TEmployer", position: { x: 400, y: 100 } },
      ],
    );
    assert.deepEqual(
      placed.map((item) => item.id),
      ["dbo.TStatus"],
    );
  });

  it("places new nodes around the anchor", () => {
    const placed = placeExpandedNodes(anchor, ["dbo.A", "dbo.B", "dbo.C"], [
      anchor,
    ]);
    assert.equal(placed.length, 3);
    for (const node of placed) {
      const dx = node.position.x - anchor.position.x;
      const dy = node.position.y - anchor.position.y;
      const distance = Math.hypot(dx, dy);
      assert.ok(distance > 200, `expected ring distance, got ${distance}`);
    }
  });

  it("returns nothing when every id is already pinned", () => {
    assert.deepEqual(
      placeExpandedNodes(anchor, ["dbo.TEmployee"], [anchor]),
      [],
    );
  });
});
