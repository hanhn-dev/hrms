import type { FieldKind } from "@/shared/messaging";

export function normalizeLabelText(raw: string): string {
  return raw.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

const CALENDAR_BUTTON_RE =
  /choose date|open calendar|pick date|select date|toggle calendar|\bcalendar\b/;

/** Single-field hosts used as per-control hints — never as a page-level library mode. */
export const FIELD_GROUP_HOST_SELECTOR = [
  ".MuiFormControl-root",
  ".MuiTextField-root",
  ".MuiPickersTextField-root",
  ".MuiPickersInputBase-root",
  ".ant-form-item",
  ".ant-select",
  ".ant-picker",
].join(", ");

function closestFieldHost(element: Element): Element | null {
  return element.closest(FIELD_GROUP_HOST_SELECTOR) ?? element.parentElement;
}

function isCalendarNamed(text: string): boolean {
  return CALENDAR_BUTTON_RE.test(text.toLowerCase());
}

function buttonAccessibleName(button: Element): string {
  return `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`;
}

/**
 * True when this control looks like a date picker: native date type is handled
 * separately; this covers combobox/text pickers with a calendar affordance.
 * Library class names are last-resort per-control hints only.
 */
export function hasCalendarSignal(element: Element): boolean {
  if (
    element.closest(
      ".ant-picker, .MuiPickersTextField-root, .MuiPickersInputBase-root",
    )
  ) {
    return true;
  }

  const host = closestFieldHost(element);
  if (
    host?.querySelector(
      '.MuiPickersSectionList-root, [role="spinbutton"]',
    ) != null
  ) {
    return true;
  }

  const ownName = `${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`;
  if (
    element.getAttribute("aria-haspopup") === "dialog" &&
    isCalendarNamed(ownName)
  ) {
    return true;
  }

  let node: Element | null = closestFieldHost(element);
  for (let depth = 0; depth < 6 && node; depth += 1) {
    const buttons = Array.from(node.querySelectorAll("button"));
    if (buttons.some((button) => isCalendarNamed(buttonAccessibleName(button)))) {
      return true;
    }
    node = node.parentElement;
  }

  return false;
}

/** @deprecated Use hasCalendarSignal — kept as the previous public name. */
export function hasDatePickerAdornment(element: Element): boolean {
  return hasCalendarSignal(element);
}

function looksLikeListboxCombobox(element: Element): boolean {
  const role = element.getAttribute("role");
  const hasPopup = element.getAttribute("aria-haspopup");
  if (role === "combobox") {
    if (hasPopup === "dialog" && hasCalendarSignal(element)) {
      return false;
    }
    return true;
  }
  if (hasPopup === "listbox") {
    return true;
  }
  if (element.closest(".ant-select, [class*='Autocomplete']")) {
    return true;
  }
  return false;
}

/**
 * Classify from the control itself (type, inputMode, autocomplete, ARIA,
 * calendar affordance). Do not map HRMS field titles (Salary, Currency,
 * Employment Type, From/To, …) — those are not portable across unseen forms.
 */
export function detectFieldKind(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  _label: string,
): FieldKind {
  const tag = element.tagName.toLowerCase();

  if (tag === "textarea") {
    return "textarea";
  }

  const input = element as HTMLInputElement;
  const type = (input.type || "text").toLowerCase();
  const inputMode = (input.inputMode || "").toLowerCase();
  const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();

  if (type === "radio") {
    return "radio";
  }

  if (type === "date" || type === "datetime-local") {
    return "date";
  }

  // Date before combobox: DatePickers often use role=combobox.
  if (hasCalendarSignal(element)) {
    return "date";
  }

  if (tag === "select") {
    return "select";
  }

  if (type === "email" || inputMode === "email" || autocomplete === "email") {
    return "email";
  }
  if (
    type === "tel" ||
    inputMode === "tel" ||
    autocomplete === "tel" ||
    autocomplete.includes("tel")
  ) {
    return "phone";
  }
  if (
    type === "number" ||
    inputMode === "numeric" ||
    inputMode === "decimal"
  ) {
    return "number";
  }

  if (looksLikeListboxCombobox(element)) {
    return "select";
  }

  return "text";
}

export function buildSelectorHint(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): string {
  if (element.id) {
    // Escape CSS special chars in React useId suffixes like :r1:
    const escaped = CSS.escape(element.id);
    return `#${escaped}`;
  }
  if (element.name) {
    return `${element.tagName.toLowerCase()}[name=${JSON.stringify(element.name)}]`;
  }
  const aria = element.getAttribute("aria-label");
  if (aria) {
    return `${element.tagName.toLowerCase()}[aria-label=${JSON.stringify(aria)}]`;
  }
  // A bare tag-name selector matches the *first* element of that tag in the
  // root, not necessarily this one (e.g. a MUI-X DatePicker's hidden
  // compatibility <input> has no id/name/aria-label). Returning "" makes
  // `findElementForField`'s querySelector fail fast so it falls back to the
  // more reliable label-based match instead of silently grabbing a different
  // field's element.
  return "";
}
