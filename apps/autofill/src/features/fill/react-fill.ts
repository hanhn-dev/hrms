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

const PICKER_OVERLAY_SELECTOR = [
  ".MuiPickersPopper-root",
  ".MuiPickerPopper-root",
  ".MuiAutocomplete-popper",
  ".MuiPopover-root:has([role='listbox'])",
  ".MuiPopover-root:has(.MuiDateCalendar-root)",
  ".MuiPopover-root:has(.MuiPickersLayout-root)",
].join(", ");

/**
 * Hide Autocomplete / DatePicker poppers without detaching React portals.
 * `node.remove()` on MUI poppers crashes the host app (removeChild NotFoundError).
 * Never send document Escape or hide `.MuiModal-root` — that closes the form
 * dialog/drawer itself and looks like the page blinking.
 */
export function dismissOpenOverlays(): void {
  document.querySelectorAll(PICKER_OVERLAY_SELECTOR).forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.setProperty("visibility", "hidden", "important");
      node.style.setProperty("pointer-events", "none", "important");
    }
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
    el.classList.contains("Mui-disabled")
  ) {
    return false;
  }
  return (el.textContent || "").trim().length > 0;
}

function collectListOptions(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll(
      [
        '.MuiAutocomplete-popper [role="option"]',
        '.MuiPopover-root [role="option"]',
        '[role="listbox"] [role="option"]',
      ].join(", "),
    ),
  ).filter(isUsableOption);
}

function matchOption(
  options: HTMLElement[],
  preferred?: string,
): HTMLElement | undefined {
  const needle = preferred?.trim().toLowerCase();
  if (!needle) {
    return options[0];
  }
  return (
    options.find((el) => (el.textContent || "").trim().toLowerCase() === needle) ??
    options.find((el) =>
      (el.textContent || "").trim().toLowerCase().includes(needle),
    ) ??
    options[0]
  );
}

function findPopupIndicator(element: HTMLElement): HTMLElement | null {
  const root =
    element.closest(".MuiAutocomplete-root") ??
    element.closest(".MuiFormControl-root") ??
    element.parentElement;
  const button = root?.querySelector(
    [
      ".MuiAutocomplete-popupIndicator",
      "button[aria-label='Open']",
      "button[title='Open']",
      "button[aria-label='Close']",
      "button[title='Close']",
    ].join(", "),
  );
  return button instanceof HTMLElement ? button : null;
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
  const chosen =
    (needle
      ? options.find(
          (option) =>
            option.value.toLowerCase() === needle ||
            option.text.trim().toLowerCase() === needle ||
            option.text.trim().toLowerCase().includes(needle),
        )
      : undefined) ?? options[Math.floor(Math.random() * options.length)]!;
  setNativeValue(element, chosen.value);
  dispatchBlur(element);
}

/**
 * Fill MUI Autocomplete / native <select> by choosing a real option.
 * Typing into Autocomplete does not fire onChange (not freeSolo) so the value
 * reverts on blur — Currency stays empty with "required".
 */
export async function fillAutocomplete(
  element: HTMLInputElement | HTMLSelectElement,
  preferred?: string,
): Promise<void> {
  if (element instanceof HTMLSelectElement) {
    fillNativeSelect(element, preferred);
    return;
  }

  const indicator = findPopupIndicator(element);
  if (indicator) {
    indicator.click();
  } else {
    element.click();
  }
  await sleep(80);

  let options = collectListOptions();
  if (
    options.length === 0 &&
    preferred &&
    preferred.length <= 12 &&
    document.querySelector(
      '.MuiAutocomplete-popper, .MuiPopover-root [role="listbox"], [role="listbox"]',
    )
  ) {
    // Short codes like INR can filter an already-open list; random sentences cannot.
    setNativeValue(element, preferred);
    await sleep(80);
    options = collectListOptions();
  }

  const option = matchOption(options, preferred);
  if (!option) {
    return;
  }

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
}
