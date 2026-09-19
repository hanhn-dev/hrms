import type { FieldKind } from "@/shared/messaging";

export function normalizeLabelText(raw: string): string {
  return raw.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

/** True when a MUI/TDG DatePicker calendar adornment sits next to the input. */
export function hasDatePickerAdornment(element: Element): boolean {
  const control = element.closest(
    ".MuiFormControl-root, .MuiTextField-root, .MuiPickersTextField-root, .MuiPickersInputBase-root",
  );
  if (!control) {
    return false;
  }
  const buttons = Array.from(control.querySelectorAll("button"));
  return buttons.some((button) => {
    const label = (
      button.getAttribute("aria-label") ||
      button.getAttribute("title") ||
      ""
    ).toLowerCase();
    return /choose date|open calendar|pick date|select date|toggle calendar|calendar/.test(
      label,
    );
  });
}

function looksLikeDateLabel(normalized: string): boolean {
  return (
    normalized === "from" ||
    normalized === "to" ||
    /\b(date|dob|birth)\b/.test(normalized) ||
    normalized.includes(" date") ||
    /date$/.test(normalized)
  );
}

export function detectFieldKind(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  label: string,
): FieldKind {
  const normalized = label.toLowerCase();
  const tag = element.tagName.toLowerCase();

  if (tag === "textarea") {
    return "textarea";
  }

  const input = element as HTMLInputElement;
  const type = (input.type || "text").toLowerCase();

  if (type === "radio") {
    return "radio";
  }

  // MUI DatePicker inputs use role="combobox" — classify as date before Autocomplete.
  if (
    type === "date" ||
    looksLikeDateLabel(normalized) ||
    hasDatePickerAdornment(element)
  ) {
    return "date";
  }

  if (tag === "select" || element.getAttribute("role") === "combobox") {
    return "select";
  }

  if (type === "email" || normalized.includes("email")) {
    return "email";
  }
  if (
    type === "tel" ||
    /mobile|phone|tel/.test(normalized)
  ) {
    return "phone";
  }
  if (
    type === "number" ||
    /salary|ctc|people reporting|headcount|amount|numeric/.test(normalized)
  ) {
    return "number";
  }
  if (
    input.getAttribute("role") === "combobox" ||
    element.closest('[class*="Autocomplete"]') != null ||
    /currency|employment type|location/.test(normalized)
  ) {
    return "select";
  }
  if (
    type === "text" &&
    (normalized.includes("address") ||
      normalized.includes("key experience") ||
      normalized.includes("experience"))
  ) {
    // Often rendered as textarea; if still input, treat as long text via textarea kind for generators
    return element.tagName.toLowerCase() === "textarea" ? "textarea" : "text";
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
