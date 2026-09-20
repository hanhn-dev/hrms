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

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value.trim() !== "";
  }

  return false;
}
