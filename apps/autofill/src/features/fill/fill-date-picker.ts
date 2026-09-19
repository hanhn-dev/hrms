import { fillControlledDateInPageWorld } from "./page-world";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface ParsedDisplayDate {
  day: number;
  monthIndex: number;
  monthShort: string;
  year: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse `DD-MMM-YYYY` display dates (e.g. `05-Jan-2020`). */
export function parseDisplayDate(value: string): ParsedDisplayDate | null {
  const match = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const monthShort =
    match[2]!.charAt(0).toUpperCase() + match[2]!.slice(1).toLowerCase();
  const year = Number(match[3]);
  const monthIndex = MONTHS_SHORT.findIndex((m) => m === monthShort);
  if (
    monthIndex < 0 ||
    !Number.isFinite(day) ||
    day < 1 ||
    day > 31 ||
    !Number.isFinite(year)
  ) {
    return null;
  }
  return { day, monthIndex, monthShort, year };
}

function formControlFor(element: HTMLElement): Element | null {
  return element.closest(
    ".MuiFormControl-root, .MuiTextField-root, .MuiPickersTextField-root, .MuiPickersInputBase-root",
  );
}

/** Calendar adornment button next to a MUI DatePicker input. */
export function findOpenPickerButton(
  element: HTMLInputElement,
): HTMLButtonElement | null {
  let node: Element | null =
    formControlFor(element) ?? element.parentElement;
  for (let depth = 0; depth < 10 && node; depth += 1) {
    const buttons = Array.from(node.querySelectorAll("button"));
    for (const button of buttons) {
      if (!(button instanceof HTMLButtonElement) || button.disabled) {
        continue;
      }
      const label = (
        button.getAttribute("aria-label") ||
        button.getAttribute("title") ||
        ""
      ).toLowerCase();
      if (
        /choose date|open calendar|pick date|select date|toggle calendar|calendar|choose/.test(
          label,
        )
      ) {
        return button;
      }
    }
    const adornment = node.querySelector(
      ".MuiInputAdornment-root button, button.MuiIconButton-root, .MuiPickersInputAdornment-root button, .MuiPickersOutlinedInput-endAdornment button",
    );
    if (adornment instanceof HTMLButtonElement && !adornment.disabled) {
      return adornment;
    }
    node = node.parentElement;
  }
  return null;
}

export function findPickerSurface(): HTMLElement | null {
  const candidates = [
    ...document.querySelectorAll(
      [
        ".MuiPickersPopper-root",
        ".MuiPickerPopper-root",
        ".MuiPickersLayout-root",
        ".MuiDateCalendar-root",
        "[role='dialog']",
      ].join(", "),
    ),
  ];
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const node = candidates[i];
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    if (
      node.style.display === "none" ||
      node.getAttribute("aria-hidden") === "true"
    ) {
      continue;
    }
    if (
      node.querySelector(
        ".MuiPickersDay-root, .MuiPickersYear-yearButton, .MuiPickersMonth-monthButton, [role='gridcell']",
      )
    ) {
      return node;
    }
  }
  return null;
}

function isDisabled(el: HTMLElement): boolean {
  return (
    el.getAttribute("disabled") != null ||
    el.getAttribute("aria-disabled") === "true" ||
    el.classList.contains("Mui-disabled")
  );
}

/** Real mouse events — same path Autocomplete uses, which already works. */
export function pointerClick(el: HTMLElement): void {
  const opts: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 0,
    buttons: 1,
  };
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.click();
}

function enabledButtons(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll(selector)).filter(
    (node): node is HTMLElement => node instanceof HTMLElement && !isDisabled(node),
  );
}

function pickClosestYear(
  buttons: HTMLElement[],
  targetYear: number,
): HTMLElement | null {
  const exact = buttons.find((el) => el.textContent?.trim() === String(targetYear));
  if (exact) {
    return exact;
  }
  let best: HTMLElement | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const el of buttons) {
    const year = Number(el.textContent?.trim());
    if (!Number.isFinite(year)) {
      continue;
    }
    const delta = Math.abs(year - targetYear);
    if (delta < bestDelta) {
      best = el;
      bestDelta = delta;
    }
  }
  return best ?? buttons[0] ?? null;
}

function pickerRoot(): ParentNode {
  return findPickerSurface() ?? document.body;
}

async function clickYear(targetYear: number): Promise<void> {
  let years = enabledButtons(pickerRoot(), ".MuiPickersYear-yearButton");
  if (years.length === 0) {
    const switcher = pickerRoot().querySelector(
      ".MuiPickersCalendarHeader-switchViewButton, .MuiPickersCalendarHeader-label, .MuiPickersCalendarHeader-labelContainer button",
    );
    if (switcher instanceof HTMLElement) {
      switcher.click();
      await sleep(200);
    }
    years = enabledButtons(pickerRoot(), ".MuiPickersYear-yearButton");
  }
  const yearBtn = pickClosestYear(years, targetYear);
  if (!yearBtn) {
    return;
  }
  yearBtn.scrollIntoView?.({ block: "nearest" });
  await sleep(50);
  yearBtn.click();
  await sleep(220);
}

async function clickMonth(monthShort: string): Promise<void> {
  const months = enabledButtons(pickerRoot(), ".MuiPickersMonth-monthButton");
  if (months.length === 0) {
    return;
  }
  const match =
    months.find((el) => {
      const text = (el.textContent || "").trim();
      return (
        text === monthShort ||
        text.slice(0, 3).toLowerCase() === monthShort.toLowerCase()
      );
    }) ?? months[0];
  if (match) {
    match.click();
    await sleep(220);
  }
}

async function clickDay(day: number): Promise<boolean> {
  const days = enabledButtons(
    pickerRoot(),
    "button.MuiPickersDay-root:not(.MuiPickersDay-dayOutsideMonth), .MuiPickersDay-root:not(.MuiPickersDay-dayOutsideMonth)",
  );
  if (days.length === 0) {
    return false;
  }
  const dayText = String(day);
  const match =
    days.find((el) => {
      const text = (el.textContent || "").trim();
      return text === dayText || text === dayText.padStart(2, "0");
    }) ?? days[0];
  if (!match) {
    return false;
  }
  try {
    match.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
  } catch {
    // jsdom / older runtimes
  }
  match.click();
  await sleep(200);
  return true;
}

function clickAccept(): void {
  const accept = enabledButtons(
    pickerRoot(),
    ".MuiPickersLayout-actionBar button, .MuiDialogActions-root button",
  ).find((el) => /^(ok|accept)$/i.test((el.textContent || "").trim()));
  if (accept) {
    accept.click();
  }
}

async function fillViaCalendar(
  element: HTMLInputElement,
  parsed: ParsedDisplayDate,
): Promise<boolean> {
  const openBtn = findOpenPickerButton(element);
  if (openBtn) {
    openBtn.click();
  } else {
    element.click();
  }
  await sleep(120);

  if (enabledButtons(pickerRoot(), ".MuiPickersYear-yearButton").length > 0) {
    await clickYear(parsed.year);
  }
  if (enabledButtons(pickerRoot(), ".MuiPickersMonth-monthButton").length > 0) {
    await clickMonth(parsed.monthShort);
  }

  const selected = await clickDay(parsed.day);
  if (!selected) {
    return false;
  }
  clickAccept();
  await sleep(150);
  return true;
}

/**
 * Fill a DatePicker through page-world React props. Isolated-world calendar
 * clicks do not update controlled pickers — they are only a test/DOM fallback.
 */
export async function fillDatePicker(
  element: HTMLInputElement,
  value: string,
  label?: string,
): Promise<void> {
  const injected = await fillControlledDateInPageWorld(element, value, label);
  if (injected) {
    // Parent state updates on the next paint; do not open the calendar after
    // a successful props fill (click-away remounts the picker to the old value).
    await sleep(150);
    return;
  }

  const parsed = parseDisplayDate(value);
  if (!parsed) {
    return;
  }

  try {
    await fillViaCalendar(element, parsed);
  } catch {
    // Leave the field empty rather than stuffing a DOM-only value React will wipe.
  }
}
