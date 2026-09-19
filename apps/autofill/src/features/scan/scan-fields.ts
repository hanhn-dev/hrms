import type { ScannedField } from "@/shared/messaging";
import {
  buildSelectorHint,
  detectFieldKind,
  normalizeLabelText,
} from "./field-types";

export type FillableElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

function isVisible(el: Element): boolean {
  const html = el as HTMLElement;
  if (html.hidden || html.getAttribute("aria-hidden") === "true") {
    return false;
  }
  const style = window.getComputedStyle(html);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }
  return true;
}

/**
 * Shell / chrome controls (header search, org switcher, etc.).
 */
export function isPageChromeControl(el: Element): boolean {
  if (
    el.closest(
      'header, nav, [role="banner"], [role="navigation"], [role="search"], [class*="AppBar"], [class*="TopBar"], [class*="Header"]',
    )
  ) {
    return true;
  }

  if (el instanceof HTMLInputElement && el.type === "search") {
    return true;
  }

  const haystack = [
    el.getAttribute("aria-label") ?? "",
    el.getAttribute("placeholder") ?? "",
    el.getAttribute("name") ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (
    /search employee|search employees|\borganizations\b|\bglobal search\b/.test(
      haystack,
    )
  ) {
    return true;
  }

  return false;
}

function isSkippableInputType(el: FillableElement): boolean {
  if (!(el instanceof HTMLInputElement)) {
    return false;
  }
  const type = (el.type || "text").toLowerCase();
  return [
    "hidden",
    "submit",
    "button",
    "image",
    "file",
    "checkbox",
    "radio",
  ].includes(type);
}

export function resolveLabel(element: FillableElement): string {
  const formControl = element.closest(
    ".MuiFormControl-root, .MuiTextField-root",
  );
  const muiLabel = formControl?.querySelector(
    "label.MuiInputLabel-root, label.MuiFormLabel-root, label",
  );
  if (muiLabel?.textContent) {
    return normalizeLabelText(muiLabel.textContent);
  }

  const aria = element.getAttribute("aria-label");
  if (aria) {
    return normalizeLabelText(aria);
  }

  if (element.id) {
    const byFor = document.querySelector(
      `label[for="${CSS.escape(element.id)}"]`,
    );
    if (byFor?.textContent) {
      return normalizeLabelText(byFor.textContent);
    }
  }

  const wrapping = element.closest("label");
  if (wrapping?.textContent) {
    return normalizeLabelText(wrapping.textContent);
  }

  if ("placeholder" in element && element.placeholder) {
    return normalizeLabelText(
      String(element.placeholder).replace(/^Enter\s+/i, ""),
    );
  }

  if (element.name) {
    return normalizeLabelText(element.name);
  }

  // Derive a label from ids like `app-field-company-name` / `field-company-name`.
  if (element.id && /(?:^|[\-_])field[\-_]/.test(element.id)) {
    const slug = element.id
      .replace(/^.*?[\-_]field[\-_]/i, "")
      .replace(/-:.*$/, "")
      .replace(/-/g, " ");
    return normalizeLabelText(slug);
  }

  return "";
}

/**
 * MUI-X DatePicker/DateField default to `enableAccessibleFieldDOMStructure: true`:
 * the editable surface is `<span role="spinbutton">` day/month/year sections, and
 * the FormControl's only `<input>` is a hidden one kept for browser autofill/testing
 * tools (aria-hidden or opacity:0). `isVisible()` rejects it like any other hidden
 * input, so without this check the whole DatePicker silently drops out of the scan.
 */
function isSectionedDateField(control: Element): boolean {
  return (
    control.querySelector('.MuiPickersSectionList-root, [role="spinbutton"]') != null
  );
}

function pickPrimaryInput(control: Element): FillableElement | null {
  const candidates = Array.from(
    control.querySelectorAll("input, textarea, select"),
  ) as FillableElement[];

  const usable = candidates.filter(
    (el) =>
      !isSkippableInputType(el) && isVisible(el) && !isPageChromeControl(el),
  );

  if (usable.length > 0) {
    return (
      usable.find((el) => el instanceof HTMLTextAreaElement) ||
      usable.find((el) => el instanceof HTMLInputElement && el.type === "tel") ||
      usable.find((el) => el.getAttribute("role") === "combobox") ||
      usable[0] ||
      null
    );
  }

  if (isSectionedDateField(control)) {
    const hiddenInput = candidates.find(
      (el) =>
        el instanceof HTMLInputElement &&
        !isSkippableInputType(el) &&
        !isPageChromeControl(el),
    );
    if (hiddenInput) {
      return hiddenInput;
    }
  }

  return null;
}

function outermostFormControls(root: ParentNode): Element[] {
  const all = Array.from(
    root.querySelectorAll(".MuiFormControl-root, .MuiTextField-root"),
  );
  return all.filter((control) => {
    const ancestor = control.parentElement?.closest(
      ".MuiFormControl-root, .MuiTextField-root",
    );
    return !ancestor || !root.contains(ancestor);
  });
}

/**
 * One logical UI field — prefer MUI FormControl grouping so phone/date/
 * autocomplete internals do not inflate the count.
 */
export function collectElements(root: ParentNode): FillableElement[] {
  const formControls = outermostFormControls(root);

  if (formControls.length >= 2) {
    const picked: FillableElement[] = [];
    const seenInputs = new Set<FillableElement>();

    for (const control of formControls) {
      const primary = pickPrimaryInput(control);
      if (!primary || seenInputs.has(primary)) {
        continue;
      }
      seenInputs.add(primary);
      picked.push(primary);
    }

    // Merge phone country FormControl + national tel FormControl that share a wrapper
    return mergePhoneControlPairs(picked);
  }

  // Non-MUI fallback: raw inputs
  const nodes = root.querySelectorAll("input, textarea, select");
  const result: FillableElement[] = [];
  nodes.forEach((node) => {
    const el = node as FillableElement;
    if (isSkippableInputType(el) || !isVisible(el) || isPageChromeControl(el)) {
      return;
    }
    result.push(el);
  });
  return result;
}

/** Country dial UI + national tel often sit as two adjacent FormControls. */
function mergePhoneControlPairs(elements: FillableElement[]): FillableElement[] {
  const out: FillableElement[] = [];

  for (let i = 0; i < elements.length; i += 1) {
    const current = elements[i]!;
    const next = elements[i + 1];

    const currentIsDial =
      current instanceof HTMLInputElement &&
      (current.getAttribute("role") === "combobox" ||
        /^\+\d/.test(current.value) ||
        /country|dial|calling/i.test(resolveLabel(current)));

    const nextIsTel =
      next instanceof HTMLInputElement &&
      (next.type === "tel" ||
        /mobile|phone/i.test(resolveLabel(next)) ||
        next.inputMode === "tel");

    if (currentIsDial && nextIsTel) {
      // Keep the tel input as the single phone field
      out.push(next);
      i += 1;
      continue;
    }

    out.push(current);
  }

  return out;
}

export interface ScanOptions {
  root?: ParentNode | null;
}

/** Discover fillable form controls under a root (document by default). */
export function scanFields(options: ScanOptions = {}): ScannedField[] {
  const root = options.root ?? document;
  const elements = collectElements(root);
  const fields: ScannedField[] = [];
  const seen = new Set<string>();

  elements.forEach((element, index) => {
    const label = resolveLabel(element);
    const kind = detectFieldKind(element, label);
    const selectorHint = buildSelectorHint(element);
    const id =
      element.id || `${selectorHint}::${label || "field"}::${index}`;

    const dedupeKey = element.id
      ? `id:${element.id}`
      : `lk:${label.toLowerCase()}|${kind}|${element.tagName}`;
    if (seen.has(dedupeKey) || seen.has(id)) {
      return;
    }
    seen.add(dedupeKey);
    seen.add(id);

    const maxLengthAttr = element.getAttribute("maxlength");
    const maxLength =
      maxLengthAttr && Number(maxLengthAttr) > 0
        ? Number(maxLengthAttr)
        : null;

    fields.push({
      id,
      label: label || `(unnamed ${kind})`,
      kind,
      tagName: element.tagName.toLowerCase(),
      inputType:
        element.tagName.toLowerCase() === "input"
          ? (element as HTMLInputElement).type || "text"
          : element.tagName.toLowerCase(),
      disabled: Boolean(element.disabled),
      readOnly:
        "readOnly" in element
          ? Boolean((element as HTMLInputElement).readOnly)
          : false,
      maxLength,
      selectorHint,
      valuePreview: (element.value || "").slice(0, 40),
    });
  });

  return fields;
}

/** Resolve a live element for a previously scanned field. */
export function findElementForField(
  field: ScannedField,
  root: ParentNode = document,
): FillableElement | null {
  try {
    const byHint = root.querySelector(field.selectorHint);
    if (
      byHint &&
      (byHint instanceof HTMLInputElement ||
        byHint instanceof HTMLTextAreaElement ||
        byHint instanceof HTMLSelectElement)
    ) {
      return byHint;
    }
  } catch {
    // Invalid selector — fall through
  }

  const all = collectElements(root);
  const match = all.find((el) => {
    const label = resolveLabel(el);
    return (
      label.toLowerCase() === field.label.toLowerCase() ||
      el.id === field.id ||
      (el.id && field.id.startsWith(el.id))
    );
  });
  return match ?? null;
}

export function resolveScanRoot(
  rootSelector?: string,
  fallback: ParentNode = document,
): ParentNode {
  if (!rootSelector) {
    return fallback;
  }
  try {
    return document.querySelector(rootSelector) ?? fallback;
  } catch {
    return fallback;
  }
}
