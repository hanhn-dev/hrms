const STYLE_ID = "form-autofill-fill-session";

/**
 * During fill, hide layers that flash a white loading page:
 * - MUI DatePicker / Autocomplete poppers
 * - My Details `SaveInProgressOverlay` (same white 72% backdrop + spinner)
 *
 * Never targets Dialog / Drawer (those are the form itself).
 */
export function startFillSession(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .MuiPickersPopper-root,
    .MuiPickerPopper-root,
    .MuiAutocomplete-popper,
    .MuiPopover-root:has([role="listbox"]),
    .MuiPopover-root:has(.MuiDateCalendar-root),
    .MuiPopover-root:has(.MuiPickersLayout-root) {
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
