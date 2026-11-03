import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { tableScroll } from "./data-table-scroll";

describe("tableScroll", () => {
  it("scrolls horizontally when the table omits scroll", () => {
    assert.deepEqual(tableScroll(undefined), { x: "max-content" });
  });

  it("keeps a caller horizontal scroll", () => {
    assert.deepEqual(tableScroll({ x: 800 }), { x: 800 });
  });

  it("keeps vertical scroll and adds horizontal scroll", () => {
    assert.deepEqual(tableScroll({ y: 400 }), { x: "max-content", y: 400 });
  });
});
