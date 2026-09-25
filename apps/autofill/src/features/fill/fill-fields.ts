import {
  generateDateRange,
  isIfscCode,
  isIfscLabel,
} from "@/shared/generators";
import type { FillReportEntry, ScannedField } from "@/shared/messaging";
import type { PersonaId } from "@/features/personas";
import type { ScenarioId } from "@/features/scenarios";
import { resolveScenarioValue } from "@/features/scenarios";
import {
  findElementForField,
  looksLikeTelerikCombo,
  scanFields,
} from "@/features/scan";
import { fillDatePicker } from "./fill-date-picker";
import { hasExistingValue } from "./has-existing-value";
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
  personaId?: PersonaId | null;
  scenarioId?: ScenarioId | null;
  /** When true, replace non-empty values. Default: skip already-filled. */
  overwriteExistingValues?: boolean;
}

export interface FillResult {
  filledCount: number;
  skippedCount: number;
  failedCount: number;
  entries: FillReportEntry[];
}

function isDateField(field: ScannedField): boolean {
  return field.kind === "date";
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

function skipReason(field: ScannedField): string {
  if (field.disabled) {
    return "Disabled";
  }
  if (/monthly\s*ctc/i.test(field.label)) {
    return "Computed / Monthly CTC";
  }
  if (
    field.readOnly &&
    !isDateField(field) &&
    field.kind !== "select" &&
    field.kind !== "radio" &&
    !looksLikeTelerikSelector(field)
  ) {
    return "Read-only";
  }
  return "Not fillable";
}

function looksLikeTelerikSelector(field: ScannedField): boolean {
  return /_Input(?:$|\s)/.test(field.selectorHint ?? "");
}

function shouldFillAsCombo(field: ScannedField, element: Element): boolean {
  return (
    field.kind === "select" ||
    element.getAttribute("role") === "combobox" ||
    looksLikeTelerikCombo(element)
  );
}

function isFillable(field: ScannedField): boolean {
  if (field.disabled) {
    return false;
  }
  // Date pickers and MUI Autocomplete often mark the input readOnly
  // while the popup/calendar remains usable. Telerik combos are readonly too.
  if (
    field.readOnly &&
    !isDateField(field) &&
    field.kind !== "select" &&
    field.kind !== "radio" &&
    !looksLikeTelerikSelector(field)
  ) {
    return false;
  }
  // Monthly CTC is typically computed/disabled on employment forms
  if (/monthly\s*ctc/i.test(field.label)) {
    return false;
  }
  return true;
}

function previewValue(value: string): string {
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}

function nodeLooksLikePostback(node: Element): boolean {
  const chunks = [
    node.getAttribute("onchange"),
    node.getAttribute("onclick"),
    node.getAttribute("href"),
  ];
  const handler = (node as HTMLElement & { onchange?: unknown }).onchange;
  if (typeof handler === "function") {
    chunks.push(Function.prototype.toString.call(handler));
  }
  return chunks.some(
    (chunk) =>
      Boolean(chunk) && /__doPostBack|WebForm_DoPostBack/i.test(chunk as string),
  );
}

/** AutoPostBack / WebForms hooks reload the page — fill these last. */
function triggersPostback(element: Element): boolean {
  if (nodeLooksLikePostback(element)) {
    return true;
  }
  const host = element.closest(".RadComboBox, .RadPicker, .RadInput");
  if (!host) {
    return false;
  }
  if (nodeLooksLikePostback(host)) {
    return true;
  }
  return Array.from(host.querySelectorAll("a, input, select, button")).some(
    (node) => nodeLooksLikePostback(node),
  );
}

function orderFillTargets(
  targets: ScannedField[],
  root: ParentNode,
): ScannedField[] {
  const dates: ScannedField[] = [];
  const rest: ScannedField[] = [];
  const postback: ScannedField[] = [];

  for (const field of targets) {
    const element = findElementForField(field, root);
    if (element && triggersPostback(element)) {
      postback.push(field);
      continue;
    }
    if (isDateField(field)) {
      dates.push(field);
    } else {
      rest.push(field);
    }
  }

  // Dates first so later focus does not remount an open calendar; postback last.
  return [...dates, ...rest, ...postback];
}

/** Instant-fill discoverable fields with persona / scenario-aware values. */
export async function fillFields(
  options: FillOptions = {},
): Promise<FillResult> {
  const root = options.root ?? document;
  const fields = scanFields({ root });
  const allCandidates = options.fieldIds?.length
    ? fields.filter((f) => options.fieldIds!.includes(f.id))
    : fields;

  const entries: FillReportEntry[] = [];
  const targets = allCandidates.filter(isFillable);

  for (const field of allCandidates) {
    if (!isFillable(field)) {
      entries.push({
        fieldId: field.id,
        label: field.label,
        kind: field.kind,
        status: "skipped",
        reason: skipReason(field),
      });
    }
  }

  if (targets.length === 0) {
    return {
      filledCount: 0,
      skippedCount: entries.length,
      failedCount: 0,
      entries,
    };
  }

  startFillSession();
  try {
    const dateRange = generateDateRange();
    let filledCount = 0;
    let failedCount = 0;

    const ordered = orderFillTargets(targets, root);

    for (const field of ordered) {
      const element = findElementForField(field, root);
      if (!element) {
        entries.push({
          fieldId: field.id,
          label: field.label,
          kind: field.kind,
          status: "skipped",
          reason: "Element not found",
        });
        continue;
      }

      if (
        !options.overwriteExistingValues &&
        hasExistingValue(element, field)
      ) {
        entries.push({
          fieldId: field.id,
          label: field.label,
          kind: field.kind,
          status: "skipped",
          reason: "Already filled",
        });
        continue;
      }

      const value = resolveScenarioValue({
        label: field.label,
        kind: field.kind,
        maxLength: field.maxLength,
        personaId: options.personaId,
        scenarioId: options.scenarioId,
        dateRange,
      });

      try {
        let ok = true;
        let reason: string | undefined;

        if (isDateField(field) && element instanceof HTMLInputElement) {
          const dateResult = await fillDatePicker(element, value, field.label);
          ok = dateResult.ok;
          if (!ok) {
            reason = `Date fill failed (${dateResult.tactic})`;
          }
        } else if (shouldFillAsCombo(field, element)) {
          // Pick from the control's real options. A generated sentence such as
          // "Acme Engineer" is not an option label — passing it used to force
          // the first row. IFSC is freeSolo and may have an empty master list.
          const preferGenerated =
            isIfscLabel(field.label) || isIfscCode(value);
          const selectResult = await fillAutocomplete(
            element as HTMLInputElement | HTMLSelectElement,
            preferGenerated ? value : undefined,
            {
              allowTypedValue: preferGenerated,
            },
          );
          ok = selectResult.ok;
          if (isIfscLabel(field.label) && ok) {
            await clickNearbyValidate(element);
          }
          if (!ok) {
            reason = `No listbox option (${selectResult.tactic})`;
          }
        } else if (
          field.kind === "radio" ||
          (element instanceof HTMLInputElement && element.type === "radio")
        ) {
          ok = fillRadio(element as HTMLInputElement);
          if (!ok) {
            reason = "No radio option available";
          }
        } else {
          element.focus();
          setNativeValue(element, value);
          dispatchBlur(element);
          ok = true;
        }

        const reportedValue =
          ok &&
          shouldFillAsCombo(field, element) &&
          "value" in element &&
          typeof element.value === "string" &&
          element.value
            ? element.value
            : value;

        if (ok) {
          filledCount += 1;
          entries.push({
            fieldId: field.id,
            label: field.label,
            kind: field.kind,
            status: "filled",
            valuePreview: previewValue(reportedValue),
          });
        } else {
          failedCount += 1;
          entries.push({
            fieldId: field.id,
            label: field.label,
            kind: field.kind,
            status: "failed",
            reason,
            valuePreview: previewValue(value),
          });
        }
      } catch (error) {
        failedCount += 1;
        entries.push({
          fieldId: field.id,
          label: field.label,
          kind: field.kind,
          status: "failed",
          reason:
            error instanceof Error ? error.message : "Unexpected fill error",
          valuePreview: previewValue(value),
        });
      }
    }

    const skippedCount = entries.filter((e) => e.status === "skipped").length;
    return { filledCount, skippedCount, failedCount, entries };
  } finally {
    dismissOpenOverlays();
    endFillSession();
  }
}
