import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  FILTER_SIDER_COLLAPSED_WIDTH,
  FILTER_SIDER_WIDTH,
} from "./filter-sider.ts";

describe("filter sider dimensions", () => {
  it("uses a narrow fixed width sized for inputs", () => {
    assert.equal(FILTER_SIDER_WIDTH, 320);
  });

  it("collapses to zero width so results can fill the page", () => {
    assert.equal(FILTER_SIDER_COLLAPSED_WIDTH, 0);
  });
});
