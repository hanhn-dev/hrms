import { ALLOWED_HOST_MATCH_PATTERNS } from "@/shared/allowed-hosts";

/** Context menu ids and helpers for the background service worker. */

export const MENU_IDS = {
  FILL: "autofill-fill-form",
  AUTO_TYPE: "autofill-auto-type-field",
} as const;

export function getContextMenuCreateProperties(): chrome.contextMenus.CreateProperties[] {
  const documentUrlPatterns = [...ALLOWED_HOST_MATCH_PATTERNS];
  return [
    {
      id: MENU_IDS.FILL,
      title: "Fill form with random data",
      contexts: ["editable", "page", "frame"],
      documentUrlPatterns,
    },
    {
      id: MENU_IDS.AUTO_TYPE,
      title: "Auto-type into this field",
      contexts: ["editable"],
      documentUrlPatterns,
    },
  ];
}

export function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    for (const item of getContextMenuCreateProperties()) {
      chrome.contextMenus.create(item);
    }
  });
}

export function isAutofillMenuId(id: string | number | undefined): boolean {
  return id === MENU_IDS.FILL || id === MENU_IDS.AUTO_TYPE;
}
