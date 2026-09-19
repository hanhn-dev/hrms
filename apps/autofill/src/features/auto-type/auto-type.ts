import { generateValue } from "@/shared/generators";
import type { ScannedField } from "@/shared/messaging";
import { findElementForField } from "@/features/scan";
import {
  clearNativeValue,
  dispatchBlur,
  fillRadio,
  setNativeValue,
} from "@/features/fill";

export interface AutoTypeOptions {
  field: ScannedField;
  root?: ParentNode;
  /** Delay between keystrokes in ms. */
  typingDelayMs?: number;
  /** Type an invalid value first, blur, then type a valid value. */
  startWithInvalid?: boolean;
  /** Override the element (e.g. context-menu target). */
  element?: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
): Promise<void> {
  element.focus();
  clearNativeValue(element);

  let buffer = "";
  for (const char of text) {
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
      await sleep(typingDelayMs);
    }
  }

  element.dispatchEvent(new Event("change", { bubbles: true }));
  dispatchBlur(element);
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
  } = options;

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
    await typeKeystroke(element, invalid || "x", typingDelayMs);
    await sleep(Math.max(typingDelayMs * 3, 150));
  }

  const valid = generateValue({
    label: field.label,
    kind: field.kind,
    maxLength: field.maxLength,
    invalid: false,
  });

  await typeKeystroke(element, valid, typingDelayMs);

  return { fieldId: field.id, label: field.label };
}
