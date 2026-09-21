const STYLE_ID = "form-autofill-fill-session";

/**
 * During fill, hide layers that flash a white loading page:
 * - Listbox / calendar portals (ARIA first; MUI and Ant Design classes extra)
 * - My Details `SaveInProgressOverlay`
 *
 * Never targets Dialog / Drawer / Modal (those are the form itself).
 */
export function startFillSession(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [role="listbox"],
    .MuiPickersPopper-root,
    .MuiPickerPopper-root,
    .MuiAutocomplete-popper,
    .MuiPopover-root:has([role="listbox"]),
    .MuiPopover-root:has(.MuiDateCalendar-root),
    .MuiPopover-root:has(.MuiPickersLayout-root),
    .ant-select-dropdown,
    .ant-picker-dropdown {
      opacity: 0 !important;
    }
    [data-testid="save-in-progress-overlay"] {
      display: none !important;
    }
  `;
  document.documentElement.appendChild(style);
}

export function endFillSession(): void {
  document.getElementById(STYLE_ID)?.remove();
}

export function isFillSessionActive(): boolean {
  return document.getElementById(STYLE_ID) != null;
}
