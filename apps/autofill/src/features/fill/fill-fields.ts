import {
  generateDateRange,
  generateValue,
  isIfscCode,
  isIfscLabel,
} from "@/shared/generators";
import type { ScannedField } from "@/shared/messaging";
import { findElementForField, scanFields } from "@/features/scan";
import { fillDatePicker } from "./fill-date-picker";
import {
  dispatchBlur,
  dismissOpenOverlays,
  fillAutocomplete,
  fillRadio,
  setNativeValue,
} from "./react-fill";
import { endFillSession, startFillSession } from "./fill-session";

export interface FillOptions {
  root?: ParentNode;
  fieldIds?: string[];
}

export interface FillResult {
  filledCount: number;
  skippedCount: number;
}

function isDateField(field: ScannedField): boolean {
  const labelLower = field.label.toLowerCase();
  return (
    field.kind === "date" || labelLower === "from" || labelLower === "to"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bank Name / Branch Name are disabled and populated from IFSC. After filling
 * a code that is not in the master, click the adjacent Validate control.
 */
function findNearbyValidateButton(
  element: Element,
): HTMLButtonElement | null {
  let node: Element | null = element;
  for (let depth = 0; depth < 8 && node; depth += 1) {
    const match = Array.from(node.querySelectorAll("button")).find((btn) => {
      if (!(btn instanceof HTMLButtonElement) || btn.disabled) {
        return false;
      }
      const haystack = `${btn.textContent || ""} ${btn.getAttribute("aria-label") || ""}`;
      return /validate/i.test(haystack);
    });
    if (match instanceof HTMLButtonElement) {
      return match;
    }
    node = node.parentElement;
  }
  return null;
}

async function clickNearbyValidate(element: Element): Promise<void> {
  await sleep(80);
  const button = findNearbyValidateButton(element);
  if (!button) {
    return;
  }
  button.click();
  await sleep(150);
}

function isFillable(field: ScannedField): boolean {
  if (field.disabled) {
    return false;
  }
  // Date pickers and MUI Autocomplete often mark the input readOnly
  // while the popup/calendar remains usable.
  if (
    field.readOnly &&
    !isDateField(field) &&
    field.kind !== "select" &&
    field.kind !== "radio"
  ) {
    return false;
  }
  // Monthly CTC is typically computed/disabled on employment forms
  if (/monthly\s*ctc/i.test(field.label)) {
    return false;
  }
  return true;
}

/** Instant-fill discoverable fields with random values. */
export async function fillFields(
  options: FillOptions = {},
): Promise<FillResult> {
  const root = options.root ?? document;
  const fields = scanFields({ root });
  const allCandidates = options.fieldIds?.length
    ? fields.filter((f) => options.fieldIds!.includes(f.id))
    : fields;

  const targets = allCandidates.filter(isFillable);
  let skippedCount = allCandidates.length - targets.length;

  if (targets.length === 0) {
    return { filledCount: 0, skippedCount };
  }

  startFillSession();
  try {
    const dateRange = generateDateRange();
    let filledCount = 0;

    // Fill dates first so later focus moves don't remount an open calendar mid-commit.
    const ordered = [
      ...targets.filter((f) => isDateField(f)),
      ...targets.filter((f) => !isDateField(f)),
    ];

    for (const field of ordered) {
      const element = findElementForField(field, root);
      if (!element) {
        skippedCount += 1;
        continue;
      }

      let value = generateValue({
        label: field.label,
        kind: field.kind,
        maxLength: field.maxLength,
      });

      const labelLower = field.label.toLowerCase();
      if (isDateField(field)) {
        value = labelLower === "to" ? dateRange.to : dateRange.from;
      }

      try {
        let filled = true;
        if (isDateField(field) && element instanceof HTMLInputElement) {
          await fillDatePicker(element, value, field.label);
        } else if (
          field.kind === "select" ||
          element.getAttribute("role") === "combobox"
        ) {
          await fillAutocomplete(
            element as HTMLInputElement | HTMLSelectElement,
            value,
            {
              allowTypedValue:
                isIfscLabel(field.label) || isIfscCode(value),
            },
          );
          if (isIfscLabel(field.label)) {
            await clickNearbyValidate(element);
          }
        } else if (
          field.kind === "radio" ||
          (element instanceof HTMLInputElement && element.type === "radio")
        ) {
          filled = fillRadio(element as HTMLInputElement);
        } else {
          element.focus();
          setNativeValue(element, value);
          dispatchBlur(element);
        }
        if (filled) {
          filledCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch {
        skippedCount += 1;
      }
    }

    return { filledCount, skippedCount };
  } finally {
    dismissOpenOverlays();
    endFillSession();
  }
}
