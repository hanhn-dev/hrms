import { generateDateRange, generateValue } from "@/shared/generators";
import type { ScannedField } from "@/shared/messaging";
import { findElementForField, scanFields } from "@/features/scan";
import { fillDatePicker } from "./fill-date-picker";
import {
  dispatchBlur,
  dismissOpenOverlays,
  fillAutocomplete,
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

function isFillable(field: ScannedField): boolean {
  if (field.disabled) {
    return false;
  }
  // Date pickers and MUI Autocomplete often mark the input readOnly
  // while the popup/calendar remains usable.
  if (field.readOnly && !isDateField(field) && field.kind !== "select") {
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
        if (isDateField(field) && element instanceof HTMLInputElement) {
          await fillDatePicker(element, value, field.label);
        } else if (
          field.kind === "select" ||
          element.getAttribute("role") === "combobox"
        ) {
          await fillAutocomplete(
            element as HTMLInputElement | HTMLSelectElement,
            value,
          );
        } else {
          element.focus();
          setNativeValue(element, value);
          dispatchBlur(element);
        }
        filledCount += 1;
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
