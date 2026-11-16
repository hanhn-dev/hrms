import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  WORK_ITEM_MARKDOWN_BOX_HEIGHT_PX,
  WORK_ITEM_MARKDOWN_BOX_MIN_HEIGHT_PX,
} from "./work-item-markdown-box-size.ts";

describe("work-item markdown box size", () => {
  it("uses a compact default preview height above the minimum", () => {
    assert.equal(WORK_ITEM_MARKDOWN_BOX_HEIGHT_PX, 180);
    assert.equal(WORK_ITEM_MARKDOWN_BOX_MIN_HEIGHT_PX, 96);
    assert.ok(WORK_ITEM_MARKDOWN_BOX_HEIGHT_PX >= WORK_ITEM_MARKDOWN_BOX_MIN_HEIGHT_PX);
  });
});
