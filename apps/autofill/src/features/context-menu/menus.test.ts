import { ALLOWED_HOST_MATCH_PATTERNS } from "@/shared/allowed-hosts";
import {
  getContextMenuCreateProperties,
  isAutofillMenuId,
  MENU_IDS,
} from "./menus";

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

describe("context menu host restriction", () => {
  it("limits both menus to the allowed host patterns (positive)", () => {
    const items = getContextMenuCreateProperties();
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.documentUrlPatterns).toEqual([...ALLOWED_HOST_MATCH_PATTERNS]);
    }
  });

  it("does not register menus for all URLs (negative)", () => {
    const items = getContextMenuCreateProperties();
    for (const item of items) {
      expect(item.documentUrlPatterns).not.toContain("<all_urls>");
    }
  });

  it("still includes fill and auto-type when patterns are present (edge)", () => {
    const ids = getContextMenuCreateProperties().map((item) => item.id);
    expect(ids).toEqual([MENU_IDS.FILL, MENU_IDS.AUTO_TYPE]);
  });
});
