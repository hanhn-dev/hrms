import { MESSAGE } from "@/shared/messaging";
import {
  needsContentScriptInject,
  shouldPrepareContentScripts,
} from "./content-inject";

describe("needsContentScriptInject", () => {
  it("skips inject when a frame already has the content API (positive)", () => {
    expect(needsContentScriptInject(1)).toBe(false);
    expect(needsContentScriptInject(3)).toBe(false);
  });

  it("injects when no frame reported ready (negative)", () => {
    expect(needsContentScriptInject(0)).toBe(true);
  });

  it("treats a missing/invalid count as not ready (edge)", () => {
    expect(needsContentScriptInject(Number.NaN)).toBe(true);
    expect(needsContentScriptInject(-1)).toBe(true);
  });
});

describe("shouldPrepareContentScripts", () => {
  it("prepares for pick, pick-fill, pick-type, and scan (positive)", () => {
    expect(shouldPrepareContentScripts(MESSAGE.START_PICK_SCAN)).toBe(true);
    expect(shouldPrepareContentScripts(MESSAGE.START_PICK_FILL)).toBe(true);
    expect(shouldPrepareContentScripts(MESSAGE.START_PICK_AUTO_TYPE)).toBe(
      true,
    );
    expect(shouldPrepareContentScripts(MESSAGE.SCAN)).toBe(true);
  });

  it("does not prepare for instant fill (negative)", () => {
    expect(shouldPrepareContentScripts(MESSAGE.FILL)).toBe(false);
  });

  it("does not prepare for unknown types (edge)", () => {
    expect(shouldPrepareContentScripts("")).toBe(false);
    expect(shouldPrepareContentScripts(MESSAGE.AUTO_TYPE)).toBe(false);
    expect(shouldPrepareContentScripts(MESSAGE.TOGGLE_FLOAT_MENU)).toBe(false);
    expect(shouldPrepareContentScripts(MESSAGE.CLOSE_FLOAT_MENU)).toBe(false);
  });
});
