import { fillControlledDateInPageWorld } from "./page-world";
import {
  dispatchBlur,
  setNativeValue,
  type FillTacticResult,
} from "./react-fill";

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
    [
      ".MuiFormControl-root",
      ".MuiTextField-root",
      ".MuiPickersTextField-root",
      ".MuiPickersInputBase-root",
      ".ant-picker",
      ".ant-form-item",
    ].join(", "),
  );
}

function toNativeDateValue(value: string): string | null {
  const parsed = parseDisplayDate(value);
  if (parsed) {
    const month = String(parsed.monthIndex + 1).padStart(2, "0");
    const day = String(parsed.day).padStart(2, "0");
    return `${parsed.year}-${month}-${day}`;
  }
  const iso = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/);
  return iso ? iso[1]! : null;
}

/** Calendar adornment next to a date input (ARIA name first, library classes last). */
export function findOpenPickerButton(
  element: HTMLInputElement,
): HTMLButtonElement | HTMLElement | null {
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
      [
        ".MuiInputAdornment-root button",
        "button.MuiIconButton-root",
        ".MuiPickersInputAdornment-root button",
        ".MuiPickersOutlinedInput-endAdornment button",
        ".ant-picker-suffix",
      ].join(", "),
    );
    if (adornment instanceof HTMLElement) {
      if (adornment instanceof HTMLButtonElement && adornment.disabled) {
        node = node.parentElement;
        continue;
      }
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
        ".ant-picker-dropdown",
        "[role='grid']",
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
        [
          ".MuiPickersDay-root",
          ".MuiPickersYear-yearButton",
          ".MuiPickersMonth-monthButton",
          "[role='gridcell']",
          ".ant-picker-cell",
        ].join(", "),
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

function dayCandidates(root: ParentNode): HTMLElement[] {
  const mui = enabledButtons(
    root,
    "button.MuiPickersDay-root:not(.MuiPickersDay-dayOutsideMonth), .MuiPickersDay-root:not(.MuiPickersDay-dayOutsideMonth)",
  );
  if (mui.length > 0) {
    return mui;
  }
  const gridCells = enabledButtons(root, "[role='gridcell']");
  if (gridCells.length > 0) {
    return gridCells;
  }
  return Array.from(
    root.querySelectorAll(
      ".ant-picker-cell:not(.ant-picker-cell-disabled), .ant-picker-cell-inner",
    ),
  ).filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && !isDisabled(node),
  );
}

async function clickDay(day: number): Promise<boolean> {
  const days = dayCandidates(pickerRoot());
  if (days.length === 0) {
    return false;
  }
  const dayText = String(day);
  const match =
    days.find((el) => {
      const text = (el.textContent || "").trim();
      const title = (el.getAttribute("title") || "").trim();
      return (
        text === dayText ||
        text === dayText.padStart(2, "0") ||
        title.endsWith(`-${dayText.padStart(2, "0")}`) ||
        title.endsWith(`/${dayText.padStart(2, "0")}`)
      );
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
 * Fill a date control: native type, React MAIN-world, typed value, then calendar.
 * Library-specific calendar clicks are the last tactic, not a page mode.
 */
export async function fillDatePicker(
  element: HTMLInputElement,
  value: string,
  label?: string,
): Promise<FillTacticResult> {
  const inputType = (element.type || "text").toLowerCase();
  if (inputType === "date" || inputType === "datetime-local") {
    const iso = toNativeDateValue(value);
    if (iso) {
      const nativeValue =
        inputType === "datetime-local" ? `${iso}T00:00` : iso;
      setNativeValue(element, nativeValue);
      dispatchBlur(element);
      if (element.value) {
        return { ok: true, tactic: "native-date" };
      }
    }
  }

  const injected = await fillControlledDateInPageWorld(element, value, label);
  if (injected) {
    // Parent state updates on the next paint; do not open the calendar after
    // a successful props fill (click-away remounts the picker to the old value).
    await sleep(150);
    return { ok: true, tactic: "react-main-world" };
  }

  const parsed = parseDisplayDate(value);

  if (
    !element.readOnly &&
    !element.disabled &&
    parsed &&
    element.getAttribute("role") !== "combobox"
  ) {
    element.focus();
    setNativeValue(element, value);
    dispatchBlur(element);
    if (element.value.trim().length > 0) {
      return { ok: true, tactic: "type-blur" };
    }
  }

  if (!parsed) {
    return { ok: false, tactic: "unparseable-date" };
  }

  try {
    const viaCalendar = await fillViaCalendar(element, parsed);
    if (viaCalendar) {
      return { ok: true, tactic: "calendar" };
    }
  } catch {
    // Leave the field empty rather than stuffing a DOM-only value React will wipe.
  }

  return { ok: false, tactic: "calendar" };
}
