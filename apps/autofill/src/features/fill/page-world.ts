/**
 * MAIN-world date fill. React fibers and DatePicker clicks only work in the
 * page JS world, so the background injects this via chrome.scripting
 * (`world: "MAIN"`). The injected function MUST be self-contained — Chrome
 * serializes it with toString(). No outer closures.
 */

import { MESSAGE } from "@/shared/messaging";

export type MainWorldFillResult = { ok: boolean; error?: string };

/**
 * Page-world DatePicker fill: update the form's string onChange/onCommit, not
 * MUI's Dayjs handler. MUI `onChange("05-Jan-2020")` is a silent no-op
 * (`isFinishedPickerDate` rejects strings), which previously looked like success.
 * Chrome serializes this function with toString() — no eval, no outer closures.
 */
export async function fillControlledDateMainWorld(
  marker: string,
  value: string,
  labelHint?: string,
): Promise<MainWorldFillResult> {
  const months = [
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
  ];

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const escaped =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(marker)
        : marker.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const element = document.querySelector(
      `[data-form-autofill-target="${escaped}"]`,
    );
    if (!(element instanceof HTMLElement)) {
      return { ok: false, error: "Target element not found" };
    }

    const hint = (labelHint || "").trim().toLowerCase();

    function fiberOf(node: Element): {
      return?: unknown;
      memoizedProps?: Record<string, unknown>;
      pendingProps?: Record<string, unknown>;
    } | null {
      const key = Object.getOwnPropertyNames(node).find(
        (k) =>
          k.startsWith("__reactFiber$") ||
          k.startsWith("__reactInternalInstance$"),
      );
      if (!key) {
        return null;
      }
      return (node as unknown as Record<string, unknown>)[key] as {
        return?: unknown;
        memoizedProps?: Record<string, unknown>;
        pendingProps?: Record<string, unknown>;
      };
    }

    function fakeDayjs(formatted: string) {
      const match = formatted
        .trim()
        .match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      const day = match ? Number(match[1]) : 1;
      const monthShort = match
        ? match[2]!.charAt(0).toUpperCase() + match[2]!.slice(1).toLowerCase()
        : "Jan";
      const year = match ? Number(match[3]) : 2020;
      const monthIndex = Math.max(
        0,
        months.findIndex((m) => m === monthShort),
      );
      const date = new Date(year, monthIndex, day);
      const api = {
        isValid: () => true,
        year: () => year,
        month: () => monthIndex,
        date: () => day,
        hour: () => 0,
        minute: () => 0,
        second: () => 0,
        millisecond: () => 0,
        format: () => formatted,
        toDate: () => date,
        toISOString: () => date.toISOString(),
        isBefore: () => false,
        isAfter: () => false,
        isSame: () => false,
        startOf: () => api,
        endOf: () => api,
        valueOf: () => date.getTime(),
        unix: () => Math.floor(date.getTime() / 1000),
        $isDayjsObject: true,
        $d: date,
        $y: year,
        $M: monthIndex,
        $D: day,
      };
      return api;
    }

    type FoundHandler = {
      onChange: (v: unknown) => void;
      onCommit?: (v: string) => void;
      score: number;
    };

    const skipScore = Number.NEGATIVE_INFINITY;

    function scoreProps(props: Record<string, unknown>): number {
      if (typeof props.onChange !== "function") {
        return skipScore;
      }
      const label =
        props.label != null ? String(props.label).trim().toLowerCase() : "";
      if (
        hint &&
        label &&
        label !== hint &&
        !label.includes(hint) &&
        !hint.includes(label)
      ) {
        return skipScore;
      }

      let score = 1;
      if (typeof props.onCommit === "function") {
        score += 100;
      }
      if (typeof props.value === "string" || props.value === null) {
        score += 50;
      }
      if (typeof props.placeholder === "string") {
        score += 20;
      }
      if (props.isMandatory != null || props.doesRequireTab != null) {
        score += 20;
      }
      if (hint && label === hint) {
        score += 30;
      }
      // MUI DatePicker: Dayjs value + slotProps. A string onChange is a no-op there.
      if (props.slotProps != null || props.format != null) {
        score -= 80;
      }
      if (props.value != null && typeof props.value === "object") {
        score -= 40;
      }
      return score;
    }

    function collectHandlers(start: Element): FoundHandler[] {
      const found: FoundHandler[] = [];
      const seen = new Set<unknown>();
      let node: Element | null = start;
      while (node) {
        let fiber = fiberOf(node);
        let depth = 0;
        while (fiber && depth < 80) {
          const props =
            (fiber.memoizedProps as Record<string, unknown> | undefined) ??
            (fiber.pendingProps as Record<string, unknown> | undefined);
          if (props && typeof props.onChange === "function" && !seen.has(props.onChange)) {
            const score = scoreProps(props);
            if (score !== skipScore) {
              seen.add(props.onChange);
              found.push({
                onChange: props.onChange as (v: unknown) => void,
                onCommit:
                  typeof props.onCommit === "function"
                    ? (props.onCommit as (v: string) => void)
                    : undefined,
                score,
              });
            }
          }
          fiber = (fiber.return as typeof fiber) ?? null;
          depth += 1;
        }
        node = node.parentElement;
      }
      found.sort((a, b) => b.score - a.score);
      return found;
    }

    function applyFormDateHandlers(start: Element): boolean {
      const handlers = collectHandlers(start);
      const formHandler = handlers.find((h) => h.score >= 50);
      if (!formHandler) {
        return false;
      }
      formHandler.onChange(value);
      if (formHandler.onCommit) {
        try {
          formHandler.onCommit(value);
        } catch {
          /* commit is best-effort */
        }
      }
      return true;
    }

    function applyMuiDateHandlers(start: Element): boolean {
      const handlers = collectHandlers(start);
      for (const handler of handlers) {
        try {
          handler.onChange(fakeDayjs(value));
          if (handler.onCommit) {
            try {
              handler.onCommit(value);
            } catch {
              /* ignore */
            }
          }
          return true;
        } catch {
          /* try next */
        }
      }
      return false;
    }

    function findCalendarButton(start: HTMLElement): HTMLButtonElement | null {
      let node: Element | null = start;
      for (let i = 0; i < 8 && node; i += 1) {
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
            /choose date|open calendar|pick date|select date|toggle calendar/.test(
              label,
            )
          ) {
            return button;
          }
        }
        const adornment = node.querySelector(
          ".MuiInputAdornment-root button, .MuiPickersInputAdornment-root button, .MuiPickersOutlinedInput-endAdornment button",
        );
        if (
          adornment instanceof HTMLButtonElement &&
          !adornment.disabled &&
          node.contains(start)
        ) {
          return adornment;
        }
        node = node.parentElement;
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

    function visiblePickerRoot(): ParentNode {
      const candidates = Array.from(
        document.querySelectorAll(
          ".MuiPickersPopper-root, .MuiPickerPopper-root, .MuiPickersLayout-root",
        ),
      );
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
        return node;
      }
      return document.body;
    }

    function enabledInPicker(selector: string): HTMLElement[] {
      return Array.from(visiblePickerRoot().querySelectorAll(selector)).filter(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          !isDisabled(node) &&
          node.style.display !== "none",
      );
    }

    if (applyFormDateHandlers(element)) {
      return { ok: true };
    }

    if (applyMuiDateHandlers(element)) {
      return { ok: true };
    }

    const parsed = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    const targetDay = parsed ? Number(parsed[1]) : 15;
    const targetMonth = parsed
      ? parsed[2]!.charAt(0).toUpperCase() + parsed[2]!.slice(1).toLowerCase()
      : "Jan";
    const targetYear = parsed ? Number(parsed[3]) : 2020;

    const openBtn = findCalendarButton(element);
    if (openBtn) {
      openBtn.click();
    } else {
      element.click();
    }
    await wait(350);

    const years = enabledInPicker(
      '.MuiPickersYear-yearButton, [class*="PickersYear"] button',
    ).filter((el) => /^\d{4}$/.test((el.textContent || "").trim()));
    if (years.length === 0) {
      const switcher = visiblePickerRoot().querySelector(
        ".MuiPickersCalendarHeader-switchViewButton, .MuiPickersCalendarHeader-label, .MuiPickersCalendarHeader-labelContainer button",
      );
      if (switcher instanceof HTMLElement) {
        switcher.click();
        await wait(250);
      }
    }
    const yearsAfter = enabledInPicker(".MuiPickersYear-yearButton").filter(
      (el) => /^\d{4}$/.test((el.textContent || "").trim()),
    );
    if (yearsAfter.length > 0) {
      const exact = yearsAfter.find(
        (el) => (el.textContent || "").trim() === String(targetYear),
      );
      (exact ?? yearsAfter[0])?.click();
      await wait(250);
    }

    const monthButtons = enabledInPicker(
      '.MuiPickersMonth-monthButton, [class*="PickersMonth"] button',
    );
    if (monthButtons.length > 0) {
      const exact = monthButtons.find((el) => {
        const text = (el.textContent || "").trim();
        return (
          text === targetMonth ||
          text.slice(0, 3).toLowerCase() === targetMonth.toLowerCase()
        );
      });
      (exact ?? monthButtons[0])?.click();
      await wait(250);
    }

    const days = enabledInPicker(
      "button.MuiPickersDay-root:not(.MuiPickersDay-dayOutsideMonth), .MuiPickersDay-root:not(.MuiPickersDay-dayOutsideMonth), [role='gridcell'] button",
    );
    if (days.length > 0) {
      const dayText = String(targetDay);
      const match =
        days.find((el) => {
          const text = (el.textContent || "").trim();
          return text === dayText || text === dayText.padStart(2, "0");
        }) ?? days[0];
      if (match) {
        match.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
        );
        match.click();
        await wait(200);
      }
    }

    const accept = enabledInPicker(
      ".MuiPickersLayout-actionBar button, .MuiDialogActions-root button",
    ).find((el) => /^(ok|accept)$/i.test((el.textContent || "").trim()));
    accept?.click();

    applyFormDateHandlers(element) || applyMuiDateHandlers(element);
    await wait(80);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function nextMarker(): string {
  return `fa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function fillControlledDateInPageWorld(
  element: HTMLInputElement,
  value: string,
  label?: string,
): Promise<boolean> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return false;
  }

  const marker = nextMarker();
  element.setAttribute("data-form-autofill-target", marker);

  try {
    const response = (await chrome.runtime.sendMessage({
      type: MESSAGE.FILL_CONTROLLED_DATE,
      marker,
      value,
      label,
    })) as MainWorldFillResult | undefined;

    return Boolean(response?.ok);
  } catch {
    return false;
  } finally {
    element.removeAttribute("data-form-autofill-target");
  }
}
