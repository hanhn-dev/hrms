/** Context menu ids and helpers for the background service worker. */

export const MENU_IDS = {
  FILL: "autofill-fill-form",
  AUTO_TYPE: "autofill-auto-type-field",
} as const;

export function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_IDS.FILL,
      title: "Fill form with random data",
      contexts: ["editable", "page", "frame"],
    });
    chrome.contextMenus.create({
      id: MENU_IDS.AUTO_TYPE,
      title: "Auto-type into this field",
      contexts: ["editable"],
    });
  });
}

export function isAutofillMenuId(id: string | number | undefined): boolean {
  return id === MENU_IDS.FILL || id === MENU_IDS.AUTO_TYPE;
}
