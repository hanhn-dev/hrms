import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { heatmapColor, seriesColor, type ChartColorTokens } from "@/shared/charts/palette";

const token: ChartColorTokens = {
  colorPrimary: "#1677FF",
  blue: "#1677FF",
  cyan: "#13C2C2",
  green: "#52C41A",
  gold: "#FAAD14",
  orange: "#FA8C16",
  volcano: "#FA541C",
  red: "#F5222D",
  magenta: "#EB2F96",
  purple: "#722ED1",
  geekblue: "#2F54EB",
  lime: "#A0D911",
  blue1: "#E6F4FF",
  blue2: "#BAE0FF",
  blue3: "#91CAFF",
  blue4: "#69B1FF",
  blue5: "#4096FF",
  blue6: "#1677FF",
};

describe("seriesColor", () => {
  it("uses the primary color for a single series and distinct presets after that", () => {
    assert.equal(seriesColor(token, 0, 1), token.colorPrimary);
    assert.equal(seriesColor(token, 0, 2), token.blue);
    assert.equal(seriesColor(token, 1, 2), token.cyan);
    assert.notEqual(seriesColor(token, 0, 2), seriesColor(token, 1, 2));
  });
});

describe("heatmapColor", () => {
  it("reads the blue steps from low to high", () => {
    assert.equal(heatmapColor(token, 0), token.blue1);
    assert.equal(heatmapColor(token, 1), token.blue6);
  });
});
