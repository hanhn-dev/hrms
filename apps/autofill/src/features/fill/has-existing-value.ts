import type { ScannedField } from "@/shared/messaging";

/** Radios in the same group (MUI radiogroup or native name). */
function radiosInGroup(element: HTMLInputElement): HTMLInputElement[] {
  const group = element.closest('[role="radiogroup"]');
  const nodes = group
    ? Array.from(group.querySelectorAll('input[type="radio"]'))
    : element.name
      ? Array.from(
          (element.form ?? document).querySelectorAll(
            `input[type="radio"][name="${CSS.escape(element.name)}"]`,
          ),
        )
      : [element];

  return nodes.filter(
    (node): node is HTMLInputElement =>
      node instanceof HTMLInputElement && node.type === "radio",
  );
}

const DATE_MASK_RE =
  /^(dd[-/.]?(mm|mmm)[-/.]?yyyy|yyyy[-/.]?mm[-/.]?dd)$/i;

/**
 * Prompt / empty-message copy such as "Select Title" or "DD-MMM-YYYY".
 * Not a real user value — Fill should treat the control as empty.
 */
export function looksLikePromptText(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  if (
    /^(select|choose|please select|enter)(\s+\w[\w\s]*)?\.?$/.test(normalized)
  ) {
    return true;
  }
  return DATE_MASK_RE.test(normalized.replace(/\s+/g, ""));
}

function hasEmptyMessageHint(element: Element): boolean {
  if (
    element.classList.contains("riEmpty") ||
    element.classList.contains("rcbEmptyMessage")
  ) {
    return true;
  }
  return element.closest(".riEmpty, .rcbEmptyMessage") != null;
}

function placeholderOf(element: Element): string {
  return (
    element.getAttribute("placeholder") ||
    element.getAttribute("aria-placeholder") ||
    element.getAttribute("emptyMessage") ||
    ""
  ).trim();
}

function normalizeForCompare(text: string): string {
  return text.replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
}

function isPromptDisplayValue(
  element: Element,
  raw: string,
  field: ScannedField,
): boolean {
  const value = raw.trim();
  if (value.length === 0) {
    return true;
  }
  if (hasEmptyMessageHint(element)) {
    return true;
  }
  const placeholder = placeholderOf(element);
  if (placeholder && value.toLowerCase() === placeholder.toLowerCase()) {
    return true;
  }
  if (
    field.label &&
    normalizeForCompare(value) === normalizeForCompare(field.label)
  ) {
    return true;
  }
  return looksLikePromptText(value);
}

function nativeSelectHasRealValue(element: HTMLSelectElement): boolean {
  const selected = element.selectedOptions[0];
  if (!selected) {
    return false;
  }
  if (selected.disabled) {
    return false;
  }
  if (selected.value.trim() === "") {
    return false;
  }
  return (
    !looksLikePromptText(selected.text) && !looksLikePromptText(selected.value)
  );
}

/**
 * True when the live control already has a user/system value that Fill
 * should leave alone (unless overwrite is enabled).
 */
export function hasExistingValue(
  element: Element,
  field: ScannedField,
): boolean {
  if (
    field.kind === "radio" ||
    (element instanceof HTMLInputElement && element.type === "radio")
  ) {
    if (!(element instanceof HTMLInputElement)) {
      return false;
    }
    return radiosInGroup(element).some((radio) => radio.checked);
  }

  if (element instanceof HTMLSelectElement) {
    return nativeSelectHasRealValue(element);
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return !isPromptDisplayValue(element, element.value, field);
  }

  return false;
}
