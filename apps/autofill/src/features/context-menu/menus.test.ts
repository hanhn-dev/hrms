import { describe, expect, it } from "vitest";
import { isAutofillMenuId, MENU_IDS } from "./menus";

describe("context menu ids", () => {
  it("recognizes fill and auto-type menu ids (positive)", () => {
    expect(isAutofillMenuId(MENU_IDS.FILL)).toBe(true);
    expect(isAutofillMenuId(MENU_IDS.AUTO_TYPE)).toBe(true);
  });

  it("rejects unknown ids (negative)", () => {
    expect(isAutofillMenuId("other-menu")).toBe(false);
  });

  it("handles undefined (edge)", () => {
    expect(isAutofillMenuId(undefined)).toBe(false);
  });
});
