import { generateValue } from "@/shared/generators";
import type { FillReportEntry, ScannedField } from "@/shared/messaging";
import { findElementForField, scanFields } from "@/features/scan";
import {
  clearNativeValue,
  dispatchBlur,
  fillRadio,
  hasExistingValue,
  setNativeValue,
} from "@/features/fill";
import { endTypeHighlight, startTypeHighlight } from "./type-session";

export class AutoTypeCancelledError extends Error {
  constructor(message = "Auto-type cancelled") {
    super(message);
    this.name = "AutoTypeCancelledError";
  }
}

export function isAutoTypeCancelled(error: unknown): boolean {
  return (
    error instanceof AutoTypeCancelledError ||
    (error instanceof Error && error.name === "AutoTypeCancelledError")
  );
}

export interface AutoTypeOptions {
  field: ScannedField;
  root?: ParentNode;
  /** Delay between keystrokes in ms. */
  typingDelayMs?: number;
  /** Type an invalid value first, blur, then type a valid value. */
  startWithInvalid?: boolean;
  /** Override the element (e.g. context-menu target). */
  element?: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  /** When aborted, stop mid-keystroke and leave the partial value. */
  signal?: AbortSignal;
}

export interface AutoTypeFieldsOptions {
  root?: ParentNode;
  /** When set, only type these field ids; otherwise type all typeable fields. */
  fieldIds?: string[];
  typingDelayMs?: number;
  startWithInvalid?: boolean;
  /** When true, replace non-empty values. Default skips already-filled. */
  overwriteExistingValues?: boolean;
  /** When aborted, stop the field loop and mark the rest Cancelled. */
  signal?: AbortSignal;
}

export interface AutoTypeFieldsResult {
  typedCount: number;
  skippedCount: number;
  failedCount: number;
  cancelled?: boolean;
  entries: FillReportEntry[];
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AutoTypeCancelledError();
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AutoTypeCancelledError());
      return;
    }
    if (ms <= 0) {
      resolve();
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      window.clearTimeout(timer);
      reject(new AutoTypeCancelledError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function fireKeyEvents(
  element: HTMLElement,
  char: string,
  type: "keydown" | "keyup",
): void {
  element.dispatchEvent(
    new KeyboardEvent(type, {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : undefined,
      bubbles: true,
      cancelable: true,
    }),
  );
}

/**
 * Type a string character-by-character so React/MUI validators update like a real user.
 * Pure sequencing helper is exported for tests via `buildTypedPrefixes`.
 */
export async function typeKeystroke(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  typingDelayMs = 60,
  signal?: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);
  element.focus();
  clearNativeValue(element);

  let buffer = "";
  try {
    for (const char of text) {
      throwIfAborted(signal);
      fireKeyEvents(element, char, "keydown");
      buffer += char;
      setNativeValue(element, buffer);

      // Prefer InputEvent when available (jsdom may only support Event)
      try {
        element.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            data: char,
            inputType: "insertText",
          }),
        );
      } catch {
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }

      fireKeyEvents(element, char, "keyup");
      if (typingDelayMs > 0) {
        await sleep(typingDelayMs, signal);
      }
    }

    element.dispatchEvent(new Event("change", { bubbles: true }));
    dispatchBlur(element);
  } catch (error) {
    if (isAutoTypeCancelled(error)) {
      dispatchBlur(element);
    }
    throw error;
  }
}

/** Test helper: prefixes produced while typing (no DOM). */
export function buildTypedPrefixes(text: string): string[] {
  const prefixes: string[] = [];
  let buffer = "";
  for (const char of text) {
    buffer += char;
    prefixes.push(buffer);
  }
  return prefixes;
}

export async function autoTypeField(
  options: AutoTypeOptions,
): Promise<{ fieldId: string; label: string }> {
  const {
    field,
    root = document,
    typingDelayMs = 60,
    startWithInvalid = false,
    signal,
  } = options;

  throwIfAborted(signal);

  const element =
    options.element ?? findElementForField(field, root);

  if (
    !element ||
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    )
  ) {
    throw new Error(`Could not locate field "${field.label}" for auto-type`);
  }

  if (element.disabled || element.readOnly) {
    throw new Error(`Field "${field.label}" is not editable`);
  }

  if (
    field.kind === "radio" ||
    (element instanceof HTMLInputElement && element.type === "radio")
  ) {
    if (!fillRadio(element as HTMLInputElement)) {
      throw new Error(`Could not check radio field "${field.label}"`);
    }
    return { fieldId: field.id, label: field.label };
  }

  if (startWithInvalid) {
    const invalid = generateValue({
      label: field.label,
      kind: field.kind,
      maxLength: field.maxLength,
      invalid: true,
    });
    // Even empty invalid still blurs to surface required errors
    await typeKeystroke(element, invalid || "x", typingDelayMs, signal);
    await sleep(Math.max(typingDelayMs * 3, 150), signal);
  }

  const valid = generateValue({
    label: field.label,
    kind: field.kind,
    maxLength: field.maxLength,
    invalid: false,
  });

  await typeKeystroke(element, valid, typingDelayMs, signal);

  return { fieldId: field.id, label: field.label };
}

function isTypeable(field: ScannedField): boolean {
  if (field.disabled) {
    return false;
  }
  if (field.kind === "select") {
    return false;
  }
  if (field.readOnly && field.kind !== "radio") {
    return false;
  }
  if (/monthly\s*ctc/i.test(field.label)) {
    return false;
  }
  return true;
}

function skipReason(field: ScannedField): string {
  if (field.disabled) {
    return "Disabled";
  }
  if (field.kind === "select") {
    return "Select (use Fill)";
  }
  if (/monthly\s*ctc/i.test(field.label)) {
    return "Computed / Monthly CTC";
  }
  if (field.readOnly && field.kind !== "radio") {
    return "Read-only";
  }
  return "Not typeable";
}

function cancelledEntry(field: ScannedField): FillReportEntry {
  return {
    fieldId: field.id,
    label: field.label,
    kind: field.kind,
    status: "skipped",
    reason: "Cancelled",
  };
}

function toCancelledResult(
  entries: FillReportEntry[],
  typedCount: number,
  failedCount: number,
): AutoTypeFieldsResult {
  return {
    typedCount,
    skippedCount: entries.filter((e) => e.status === "skipped").length,
    failedCount,
    cancelled: true,
    entries,
  };
}

/**
 * Sequentially keystroke-type each typeable field under a form section
 * (or a checked subset), mirroring fillFields' multi-field loop.
 */
export async function autoTypeFields(
  options: AutoTypeFieldsOptions = {},
): Promise<AutoTypeFieldsResult> {
  const root = options.root ?? document;
  const typingDelayMs = options.typingDelayMs ?? 60;
  const startWithInvalid = options.startWithInvalid ?? false;
  const signal = options.signal;
  const highlightId = startTypeHighlight(root);

  try {
    throwIfAborted(signal);

    const fields = scanFields({ root });
    const allCandidates = options.fieldIds?.length
      ? fields.filter((f) => options.fieldIds!.includes(f.id))
      : fields;

    const entries: FillReportEntry[] = [];
    const targets = allCandidates.filter(isTypeable);

    for (const field of allCandidates) {
      if (!isTypeable(field)) {
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
        typedCount: 0,
        skippedCount: entries.length,
        failedCount: 0,
        entries,
      };
    }

    let typedCount = 0;
    let failedCount = 0;
    const betweenDelay =
      typingDelayMs <= 0 ? 0 : Math.max(typingDelayMs * 3, 150);

    for (let i = 0; i < targets.length; i += 1) {
      if (signal?.aborted) {
        for (const remaining of targets.slice(i)) {
          entries.push(cancelledEntry(remaining));
        }
        return toCancelledResult(entries, typedCount, failedCount);
      }

      const field = targets[i]!;
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

      try {
        await autoTypeField({
          field,
          root,
          element:
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement
              ? element
              : null,
          typingDelayMs,
          startWithInvalid,
          signal,
        });
        typedCount += 1;
        entries.push({
          fieldId: field.id,
          label: field.label,
          kind: field.kind,
          status: "filled",
        });
      } catch (error) {
        if (isAutoTypeCancelled(error)) {
          entries.push(cancelledEntry(field));
          for (const remaining of targets.slice(i + 1)) {
            entries.push(cancelledEntry(remaining));
          }
          return toCancelledResult(entries, typedCount, failedCount);
        }
        failedCount += 1;
        entries.push({
          fieldId: field.id,
          label: field.label,
          kind: field.kind,
          status: "failed",
          reason: error instanceof Error ? error.message : "Auto-type failed",
        });
      }

      if (i < targets.length - 1 && betweenDelay > 0) {
        try {
          await sleep(betweenDelay, signal);
        } catch (error) {
          if (isAutoTypeCancelled(error)) {
            for (const remaining of targets.slice(i + 1)) {
              entries.push(cancelledEntry(remaining));
            }
            return toCancelledResult(entries, typedCount, failedCount);
          }
          throw error;
        }
      }
    }

    const skippedCount = entries.filter((e) => e.status === "skipped").length;

    return {
      typedCount,
      skippedCount,
      failedCount,
      entries,
    };
  } finally {
    endTypeHighlight(highlightId);
  }
}
