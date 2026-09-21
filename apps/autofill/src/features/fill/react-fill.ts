/** Set a value on a React-controlled input/textarea and notify listeners. */

type FillableElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

type ValueTracker = { setValue: (value: string) => void };

function getValueTracker(element: FillableElement): ValueTracker | null {
  const tracker = (element as FillableElement & {
    _valueTracker?: ValueTracker;
  })._valueTracker;
  return tracker ?? null;
}

function getNativeValueSetter(
  element: FillableElement,
): ((this: FillableElement, value: string) => void) | undefined {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

  return Object.getOwnPropertyDescriptor(prototype, "value")?.set;
}

/**
 * Update a controlled React/MUI input the way React's own change events expect:
 * reset the internal value tracker, set via the native setter, then fire input/change.
 */
export function setNativeValue(element: FillableElement, value: string): void {
  const previous = element.value;
  const setter = getNativeValueSetter(element);

  getValueTracker(element)?.setValue(
    previous === value ? `${value}\u200b` : previous,
  );

  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }

  try {
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        data: value,
        inputType: "insertReplacementText",
      }),
    );
  } catch {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function dispatchBlur(element: FillableElement): void {
  element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
}

export function clearNativeValue(element: FillableElement): void {
  element.focus();
  setNativeValue(element, "");
}

/**
 * Dropdown / calendar portals. Library class names are extra hints only.
 * Never include form shells (role=dialog, .ant-modal, MUI Dialog/Drawer).
 */
const PICKER_OVERLAY_SELECTOR = [
  "[role='listbox']",
  ".MuiPickersPopper-root",
  ".MuiPickerPopper-root",
  ".MuiAutocomplete-popper",
  ".MuiPopover-root:has([role='listbox'])",
  ".MuiPopover-root:has(.MuiDateCalendar-root)",
  ".MuiPopover-root:has(.MuiPickersLayout-root)",
  ".ant-select-dropdown",
  ".ant-picker-dropdown",
].join(", ");

/**
 * Hide list / calendar overlays without detaching React portals.
 * `node.remove()` on MUI poppers crashes the host app (removeChild NotFoundError).
 * Never send document Escape or hide `.MuiModal-root` / `.ant-modal` — that
 * closes the form dialog itself.
 */
export function dismissOpenOverlays(): void {
  document.querySelectorAll(PICKER_OVERLAY_SELECTOR).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    if (
      node.closest(
        ".MuiDialog-root, .MuiDrawer-root, .MuiModal-root, .ant-modal, [role='dialog']",
      ) &&
      !node.matches(PICKER_OVERLAY_SELECTOR)
    ) {
      return;
    }
    node.style.setProperty("visibility", "hidden", "important");
    node.style.setProperty("pointer-events", "none", "important");
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUsableOption(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) {
    return false;
  }
  if (
    el.getAttribute("aria-disabled") === "true" ||
    el.classList.contains("Mui-disabled") ||
    el.classList.contains("ant-select-item-option-disabled")
  ) {
    return false;
  }
  return (el.textContent || "").trim().length > 0;
}

function optionsIn(root: ParentNode | Element | null): HTMLElement[] {
  if (!root) {
    return [];
  }
  const seen = new Set<HTMLElement>();
  const collected: HTMLElement[] = [];
  const nodes = root.querySelectorAll(
    '[role="option"], .ant-select-item-option',
  );
  nodes.forEach((node) => {
    if (!isUsableOption(node) || seen.has(node)) {
      return;
    }
    seen.add(node);
    collected.push(node);
  });
  return collected;
}

function optionsFromAria(element: HTMLElement): HTMLElement[] {
  const ids = [
    element.getAttribute("aria-controls"),
    element.getAttribute("aria-owns"),
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/\s+/).filter(Boolean));

  const collected: HTMLElement[] = [];
  for (const id of ids) {
    collected.push(...optionsIn(document.getElementById(id)));
  }
  return collected;
}

const LIST_PORTAL_SELECTOR = [
  "[role='listbox']",
  ".MuiAutocomplete-popper",
  ".MuiPopover-root",
  ".ant-select-dropdown",
].join(", ");

/**
 * Options that belong to *this* combobox — never leftover lists from Account
 * Type / Currency still sitting in the DOM after the previous field filled.
 */
function collectListOptionsFor(
  element: HTMLElement,
  newPoppers: Element[],
): HTMLElement[] {
  const fromAria = optionsFromAria(element);
  if (fromAria.length > 0) {
    return fromAria;
  }
  for (const popper of newPoppers) {
    const fromPopper = optionsIn(popper);
    if (fromPopper.length > 0) {
      return fromPopper;
    }
  }
  return [];
}

function snapshotPoppers(): Set<Element> {
  return new Set(document.querySelectorAll(LIST_PORTAL_SELECTOR));
}

function poppersOpenedSince(before: Set<Element>): Element[] {
  return Array.from(document.querySelectorAll(LIST_PORTAL_SELECTOR)).filter(
    (node) => !before.has(node),
  );
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Prompt rows such as "Select country" — skip these when choosing at random. */
function looksLikePlaceholder(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return (
    normalized.length === 0 ||
    /^(select|choose|please select)(\s+\w[\w\s]*)?\.?$/.test(normalized)
  );
}

function pickRandomChoice<T>(
  items: T[],
  isPlaceholder: (item: T) => boolean,
): T | undefined {
  const real = items.filter((item) => !isPlaceholder(item));
  return pickRandom(real.length > 0 ? real : items);
}

function matchOption(
  options: HTMLElement[],
  preferred?: string,
): HTMLElement | undefined {
  const needle = preferred?.trim().toLowerCase();
  if (needle) {
    const matched =
      options.find(
        (el) => (el.textContent || "").trim().toLowerCase() === needle,
      ) ??
      options.find((el) =>
        (el.textContent || "").trim().toLowerCase().includes(needle),
      );
    if (matched) {
      return matched;
    }
  }
  return pickRandomChoice(options, (el) =>
    looksLikePlaceholder(el.textContent || ""),
  );
}

function looksLikeOpenControl(node: Element): boolean {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  if (
    node.classList.contains("MuiAutocomplete-popupIndicator") ||
    node.classList.contains("ant-select-arrow") ||
    node.classList.contains("ant-select-selector")
  ) {
    return true;
  }
  const label = (
    `${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""}`
  ).toLowerCase();
  return /^(open|close|expand)$/.test(label.trim()) || /\b(open|expand|close)\b/.test(label);
}

function findPopupIndicator(element: HTMLElement): HTMLElement | null {
  const roots: Array<Element | null> = [
    element.closest(
      ".MuiAutocomplete-root, .MuiFormControl-root, .ant-select, .ant-form-item",
    ),
    element.parentElement,
  ];
  for (const root of roots) {
    if (!root) {
      continue;
    }
    const candidates = Array.from(
      root.querySelectorAll(
        "button, .MuiAutocomplete-popupIndicator, .ant-select-arrow, .ant-select-selector",
      ),
    );
    const match = candidates.find((node) => looksLikeOpenControl(node));
    if (match instanceof HTMLElement) {
      return match;
    }
  }
  return null;
}

function fillNativeSelect(
  element: HTMLSelectElement,
  preferred?: string,
): void {
  const options = Array.from(element.options).filter(
    (option) => !option.disabled && option.value !== "" && option.text.trim() !== "",
  );
  if (options.length === 0) {
    return;
  }
  const needle = preferred?.trim().toLowerCase();
  const matched = needle
    ? options.find(
        (option) =>
          option.value.toLowerCase() === needle ||
          option.text.trim().toLowerCase() === needle ||
          option.text.trim().toLowerCase().includes(needle),
      )
    : undefined;
  const chosen =
    matched ??
    pickRandomChoice(options, (option) =>
      looksLikePlaceholder(option.text),
    );
  if (!chosen) {
    return;
  }
  setNativeValue(element, chosen.value);
  dispatchBlur(element);
}

export interface FillAutocompleteOptions {
  /**
   * When this combobox has no pickable options (freeSolo IFSC, empty master),
   * type `preferred` instead of leaving the field blank. Do not use for
   * ordinary Autocomplete — typed values revert on blur.
   */
  allowTypedValue?: boolean;
}

export interface FillTacticResult {
  ok: boolean;
  tactic: string;
}

/**
 * Fill native <select> or a combobox by choosing a real option.
 * ARIA listbox first; MUI / Ant Design portal classes are extra hosts only.
 * Typing a generated sentence does not fire onChange on most Autocompletes.
 */
export async function fillAutocomplete(
  element: HTMLInputElement | HTMLSelectElement,
  preferred?: string,
  fillOptions: FillAutocompleteOptions = {},
): Promise<FillTacticResult> {
  if (element instanceof HTMLSelectElement) {
    fillNativeSelect(element, preferred);
    return {
      ok: element.value.length > 0,
      tactic: "native-select",
    };
  }

  const beforePoppers = snapshotPoppers();
  const indicator = findPopupIndicator(element);
  if (indicator) {
    indicator.click();
  } else {
    element.click();
  }
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    }),
  );

  let options: HTMLElement[] = [];
  let newPoppers: Element[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await sleep(80);
    newPoppers = poppersOpenedSince(beforePoppers);
    options = collectListOptionsFor(element, newPoppers);
    if (options.length > 0) {
      break;
    }
    if (optionsFromAria(element).length === 0 && newPoppers.length > 0) {
      // This field opened an empty list — don't wait for leftover lists.
      break;
    }
    if (!indicator && newPoppers.length === 0 && attempt === 0) {
      break;
    }
  }

  if (
    options.length === 0 &&
    preferred &&
    preferred.length <= 12 &&
    (newPoppers.length > 0 || optionsFromAria(element).length > 0)
  ) {
    // Short codes like INR can filter an already-open list; random sentences cannot.
    setNativeValue(element, preferred);
    await sleep(80);
    newPoppers = poppersOpenedSince(beforePoppers);
    options = collectListOptionsFor(element, newPoppers);
  }

  const option = matchOption(options, preferred);
  if (option) {
    option.scrollIntoView?.({ block: "nearest" });
    try {
      option.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
    } catch {
      // jsdom / older runtimes
    }
    option.click();
    await sleep(40);
    return { ok: true, tactic: "listbox-option" };
  }

  if (
    fillOptions.allowTypedValue &&
    preferred &&
    !element.readOnly &&
    !element.disabled
  ) {
    element.focus();
    setNativeValue(element, preferred);
    dispatchBlur(element);
    return { ok: true, tactic: "typed-value" };
  }

  return { ok: false, tactic: "listbox-option" };
}

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

  return nodes.filter((node): node is HTMLInputElement => {
    if (!(node instanceof HTMLInputElement) || node.type !== "radio") {
      return false;
    }
    if (node.disabled) {
      return false;
    }
        const host =
          node.closest(
            '.MuiRadio-root, .MuiFormControlLabel-root, .ant-radio-wrapper, .ant-radio, [role="radiogroup"]',
          ) ?? node;
    if (
      host instanceof HTMLElement &&
      (host.hidden || host.getAttribute("aria-hidden") === "true")
    ) {
      return false;
    }
    return true;
  });
}

function radioOptionLabel(radio: HTMLInputElement): string {
  const wrapping = radio.closest("label");
  if (wrapping?.textContent) {
    return wrapping.textContent.replace(/\s+/g, " ").trim();
  }
  return (radio.getAttribute("aria-label") || radio.value || "").trim();
}

/**
 * Check a radio the way React's tracker expects: native `checked` setter,
 * then click/change so MUI RadioGroup onChange runs.
 */
export function setNativeChecked(
  element: HTMLInputElement,
  checked: boolean,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "checked",
  );
  const tracker = (
    element as HTMLInputElement & {
      _valueTracker?: { setValue: (value: string) => void };
    }
  )._valueTracker;

  const previous = String(Boolean(element.checked));
  tracker?.setValue(
    checked ? (previous === "true" ? "false" : previous) : previous,
  );

  if (descriptor?.set) {
    descriptor.set.call(element, checked);
  } else {
    element.checked = checked;
  }

  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Select one option in a radio group (MUI RadioGroup or native radios).
 * Returns false when nothing in the group can be checked.
 */
export function fillRadio(
  element: HTMLInputElement,
  preferred?: string,
): boolean {
  const radios = radiosInGroup(element);
  if (radios.length === 0) {
    return false;
  }

  const needle = preferred?.trim().toLowerCase();
  const matched = needle
    ? radios.find((radio) => radio.value.toLowerCase() === needle) ||
      radios.find(
        (radio) => radioOptionLabel(radio).toLowerCase() === needle,
      ) ||
      radios.find((radio) =>
        radioOptionLabel(radio).toLowerCase().includes(needle),
      )
    : undefined;
  const chosen =
    matched ??
    pickRandomChoice(radios, (radio) =>
      looksLikePlaceholder(radioOptionLabel(radio)),
    );
  if (!chosen) {
    return false;
  }

  if (!chosen.checked) {
    chosen.click();
  }
  if (!chosen.checked) {
    chosen.closest("label")?.click();
  }
  if (!chosen.checked) {
    setNativeChecked(chosen, true);
  }

  return chosen.checked;
}
