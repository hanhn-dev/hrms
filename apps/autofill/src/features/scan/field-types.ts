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
  ".RadComboBox",
  "[class^='RadComboBox_']",
  ".RadPicker",
  "[class^='RadPicker_']",
  ".RadInput",
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
      ".ant-picker, .MuiPickersTextField-root, .MuiPickersInputBase-root, .RadPicker, [class^='RadPicker_']",
    )
  ) {
    return true;
  }

  const host = closestFieldHost(element);
  if (
    host?.querySelector(
      '.MuiPickersSectionList-root, [role="spinbutton"], .rcCalPopup',
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
  if (
    element.closest(".ant-select, [class*='Autocomplete']") ||
    element.classList.contains("rcbInput") ||
    closestComboHost(element) ||
    hasTelerikInputArrowPair(element)
  ) {
    return true;
  }
  if (hasAdjacentListArrow(element)) {
    return true;
  }
  return false;
}

/** Telerik combo host. Skin class is `RadComboBox_Bootstrap` — not DropDown. */
function hasTelerikInputArrowPair(element: Element): boolean {
  if (!element.id.endsWith("_Input")) {
    return false;
  }
  return document.getElementById(`${element.id.slice(0, -6)}_Arrow`) != null;
}

/** Visible Telerik combo input — host class is optional on some skins. */
export function looksLikeTelerikCombo(element: Element): boolean {
  return (
    closestComboHost(element) != null ||
    element.classList.contains("rcbInput") ||
    hasTelerikInputArrowPair(element)
  );
}

export function closestComboHost(element: Element): Element | null {
  let node: Element | null = element;
  while (node && node !== document.documentElement) {
    if (node.classList.contains("RadComboBoxDropDown")) {
      node = node.parentElement;
      continue;
    }
    if (node.classList.contains("RadComboBox")) {
      return node;
    }
    if ([...node.classList].some((cls) => cls.startsWith("RadComboBox_"))) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

const LIST_ARROW_SELECTOR =
  ".rcbArrowCell, .rcbButton, .rcbActionButton, [id$='_Arrow'], .MuiAutocomplete-popupIndicator, .ant-select-arrow";

function isListArrowNode(node: Element | null): boolean {
  return node != null && node.matches(LIST_ARROW_SELECTOR);
}

/**
 * Open/arrow control for *this* field only. Do not search an ancestor that
 * wraps sibling inputs — that would turn a nearby text box into a select.
 */
function hasAdjacentListArrow(element: Element): boolean {
  const host =
    closestComboHost(element) ??
    element.closest(".ant-select, .MuiAutocomplete-root");
  if (host) {
    return host.querySelector(LIST_ARROW_SELECTOR) != null;
  }
  if (
    isListArrowNode(element.previousElementSibling) ||
    isListArrowNode(element.nextElementSibling)
  ) {
    return true;
  }
  const parent = element.parentElement;
  if (!parent || parent === document.body || parent === document.documentElement) {
    return false;
  }
  const arrows = parent.querySelectorAll(LIST_ARROW_SELECTOR);
  const inputs = parent.querySelectorAll("input, textarea, select");
  return arrows.length > 0 && inputs.length === 1;
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
