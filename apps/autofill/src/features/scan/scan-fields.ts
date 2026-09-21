import type { ScannedField } from "@/shared/messaging";
import {
  buildSelectorHint,
  detectFieldKind,
  FIELD_GROUP_HOST_SELECTOR,
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

/**
 * MUI Radio renders `opacity: 0` on the native input (PrivateSwitchBase).
 * Visibility must be taken from the painted host, not the hidden input.
 */
function radioHost(el: Element): Element {
  return (
    el.closest(
      '.MuiRadio-root, .MuiFormControlLabel-root, .ant-radio-wrapper, .ant-radio, [role="radiogroup"]',
    ) ?? el
  );
}

function isUsableRadio(el: Element): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement) || el.type !== "radio") {
    return false;
  }
  if (el.disabled || isPageChromeControl(el)) {
    return false;
  }
  return isVisible(radioHost(el));
}

/**
 * Group label — never the wrapping option label ("YES" / "NO").
 */
function resolveRadioGroupLabel(element: HTMLInputElement): string {
  const group = element.closest('[role="radiogroup"]');
  if (group) {
    const labelledBy = group.getAttribute("aria-labelledby");
    if (labelledBy) {
      const viaId = document.getElementById(labelledBy);
      if (viaId?.textContent) {
        return normalizeLabelText(viaId.textContent);
      }
    }
    const aria = group.getAttribute("aria-label");
    if (aria) {
      return normalizeLabelText(aria);
    }

    const parent = group.parentElement;
    if (parent) {
      for (const child of Array.from(parent.children)) {
        if (child === group || child.contains(element)) {
          continue;
        }
        if (child.matches("input, textarea, select, button")) {
          continue;
        }
        const text = normalizeLabelText(child.textContent || "");
        if (text) {
          return text;
        }
      }
    }
  }

  const formControl = element.closest(
    ".MuiFormControl-root, .MuiTextField-root, .ant-form-item, fieldset",
  );
  const groupLabel = formControl?.querySelector(
    "legend, label.MuiFormLabel-root, label.MuiInputLabel-root, .ant-form-item-label label",
  );
  if (groupLabel?.textContent) {
    return normalizeLabelText(groupLabel.textContent);
  }

  const fieldset = element.closest("fieldset");
  const legend = fieldset?.querySelector(":scope > legend");
  if (legend?.textContent) {
    return normalizeLabelText(legend.textContent);
  }

  if (element.name) {
    return normalizeLabelText(element.name);
  }

  return "";
}

export function resolveLabel(element: FillableElement): string {
  if (element instanceof HTMLInputElement && element.type === "radio") {
    return resolveRadioGroupLabel(element);
  }

  const formControl = element.closest(
    ".MuiFormControl-root, .MuiTextField-root, .ant-form-item",
  );
  const groupedLabel = formControl?.querySelector(
    "label.MuiInputLabel-root, label.MuiFormLabel-root, .ant-form-item-label label, label",
  );
  if (groupedLabel?.textContent) {
    return normalizeLabelText(groupedLabel.textContent);
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

export function pickPrimaryInput(control: Element): FillableElement | null {
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

  const radio = candidates.find((el) => isUsableRadio(el));
  if (radio) {
    return radio;
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

function collectRadioGroupPrimaries(root: ParentNode): HTMLInputElement[] {
  const primaries: HTMLInputElement[] = [];
  const seen = new Set<string>();

  const groups = Array.from(root.querySelectorAll('[role="radiogroup"]'));
  for (const group of groups) {
    const radios = Array.from(
      group.querySelectorAll('input[type="radio"]'),
    ).filter(isUsableRadio);
    if (radios.length === 0) {
      continue;
    }
    const first = radios[0]!;
    const key = first.name ? `name:${first.name}` : `group:${primaries.length}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    primaries.push(first);
  }

  const loose = Array.from(root.querySelectorAll('input[type="radio"]'))
    .filter(isUsableRadio)
    .filter((el) => !el.closest('[role="radiogroup"]'));
  const byName = new Map<string, HTMLInputElement[]>();
  let unnamed = 0;
  for (const radio of loose) {
    const key = radio.name || `__unnamed_${unnamed++}`;
    const list = byName.get(key) ?? [];
    list.push(radio);
    byName.set(key, list);
  }
  for (const [key, radios] of byName) {
    if (radios.length === 0) {
      continue;
    }
    const seenKey = key.startsWith("__unnamed_") ? `anon:${key}` : `name:${key}`;
    if (seen.has(seenKey)) {
      continue;
    }
    seen.add(seenKey);
    primaries.push(radios[0]!);
  }

  return primaries;
}

function mergeRadioGroups(
  elements: FillableElement[],
  root: ParentNode,
): FillableElement[] {
  const existingNames = new Set(
    elements
      .filter(
        (el): el is HTMLInputElement =>
          el instanceof HTMLInputElement && el.type === "radio",
      )
      .map((el) => el.name)
      .filter(Boolean),
  );
  const existing = new Set(elements);
  const extras: FillableElement[] = [];

  for (const radio of collectRadioGroupPrimaries(root)) {
    if (existing.has(radio)) {
      continue;
    }
    if (radio.name && existingNames.has(radio.name)) {
      continue;
    }
    extras.push(radio);
    if (radio.name) {
      existingNames.add(radio.name);
    }
  }

  return extras.length === 0 ? elements : [...elements, ...extras];
}

function radioGroupPreview(element: FillableElement): string {
  if (!(element instanceof HTMLInputElement) || element.type !== "radio") {
    return (element.value || "").slice(0, 40);
  }
  const group = element.closest('[role="radiogroup"]');
  const radios = group
    ? Array.from(group.querySelectorAll('input[type="radio"]'))
    : element.name
      ? Array.from(
          (element.form ?? document).querySelectorAll(
            `input[type="radio"][name="${CSS.escape(element.name)}"]`,
          ),
        )
      : [element];
  const checked = radios.find(
    (node): node is HTMLInputElement =>
      node instanceof HTMLInputElement && node.checked,
  );
  return (checked?.value || "").slice(0, 40);
}

function outermostGroupHosts(root: ParentNode): Element[] {
  const all = Array.from(root.querySelectorAll(FIELD_GROUP_HOST_SELECTOR));
  return all.filter((control) => {
    const ancestor = control.parentElement?.closest(FIELD_GROUP_HOST_SELECTOR);
    return !ancestor || !root.contains(ancestor);
  });
}

/**
 * One logical UI field. Group hosts (MUI FormControl, Ant Design Form.Item /
 * Select / Picker) collapse inner extras; native inputs outside those hosts
 * are still collected so mixed pages fill.
 */
export function collectElements(root: ParentNode): FillableElement[] {
  const picked: FillableElement[] = [];
  const seenInputs = new Set<Element>();

  for (const host of outermostGroupHosts(root)) {
    const primary = pickPrimaryInput(host);
    if (primary && !seenInputs.has(primary)) {
      picked.push(primary);
      seenInputs.add(primary);
    }
    host.querySelectorAll("input, textarea, select").forEach((node) => {
      seenInputs.add(node);
    });
  }

  root.querySelectorAll("input, textarea, select").forEach((node) => {
    if (seenInputs.has(node)) {
      return;
    }
    const el = node as FillableElement;
    if (isSkippableInputType(el) || !isVisible(el) || isPageChromeControl(el)) {
      return;
    }
    seenInputs.add(el);
    picked.push(el);
  });

  return mergeRadioGroups(mergePhoneControlPairs(picked), root);
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

/**
 * True when the node itself is a fillable control (including radio).
 * Used by the control-mode picker; does not walk into arbitrary ancestors.
 */
export function asFillableControl(el: Element): FillableElement | null {
  if (
    !(
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    )
  ) {
    return null;
  }

  if (el instanceof HTMLInputElement && el.type === "radio") {
    return isUsableRadio(el) ? el : null;
  }

  if (isSkippableInputType(el) || !isVisible(el) || isPageChromeControl(el)) {
    return null;
  }

  return el;
}

/** Map a live control to the scan payload used for fill / auto-type. */
export function scannedFieldFromElement(
  element: FillableElement,
  index = 0,
): ScannedField {
  const label = resolveLabel(element);
  const kind = detectFieldKind(element, label);
  const selectorHint = buildSelectorHint(element);
  const id = element.id || `${selectorHint}::${label || "field"}::${index}`;
  const maxLengthAttr = element.getAttribute("maxlength");
  const maxLength =
    maxLengthAttr && Number(maxLengthAttr) > 0
      ? Number(maxLengthAttr)
      : null;

  return {
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
    valuePreview: radioGroupPreview(element),
  };
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
    const field = scannedFieldFromElement(element, index);
    const dedupeKey = element.id
      ? `id:${element.id}`
      : `lk:${field.label.toLowerCase()}|${field.kind}|${element.tagName}`;
    if (seen.has(dedupeKey) || seen.has(field.id)) {
      return;
    }
    seen.add(dedupeKey);
    seen.add(field.id);
    fields.push(field);
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
