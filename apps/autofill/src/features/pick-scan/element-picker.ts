import {
  markScanRoot,
  pickHighlightHost,
  resolvePickControl,
  resolvePickRoot,
  scanFromElement,
} from "@/features/scan/resolve-pick-root";
import {
  scannedFieldFromElement,
  type FillableElement,
} from "@/features/scan/scan-fields";
import { showPageToast } from "@/shared/page-toast";

const OVERLAY_ID = "form-autofill-pick-overlay";
const HIGHLIGHT_ID = "form-autofill-pick-highlight";
const BANNER_ID = "form-autofill-pick-banner";

const SECTION_BANNER =
  "Click the form section (blue box = scan area) · Esc cancels";
const CONTROL_BANNER = "Click the field to auto-type · Esc cancels";

export type PickMode = "section" | "control";

export interface StartPickerOptions {
  mode?: PickMode;
  bannerText?: string;
  /** When false, skip the "scanned N field(s)" toast (caller announces). */
  announceScan?: boolean;
}

export type PickScanResult = {
  fields: ReturnType<typeof scanFromElement>["fields"];
  rootSelector: string;
  fieldCount: number;
  url: string;
  /** Live control when mode is "control" — stays in the content script. */
  element?: FillableElement;
};

type PickResolve = (result: PickScanResult | null) => void;

let activeResolve: PickResolve | null = null;
let onMove: ((ev: MouseEvent) => void) | null = null;
let onClick: ((ev: MouseEvent) => void) | null = null;
let onKey: ((ev: KeyboardEvent) => void) | null = null;

function isPickerChrome(target: Element): boolean {
  return (
    target.id === HIGHLIGHT_ID ||
    target.id === BANNER_ID ||
    Boolean(target.closest(`#${BANNER_ID}`))
  );
}

function ensureHighlight(): HTMLDivElement {
  let el = document.getElementById(HIGHLIGHT_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = HIGHLIGHT_ID;
    Object.assign(el.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "2147483646",
      border: "2px solid #1677ff",
      background: "rgba(22, 119, 255, 0.12)",
      borderRadius: "4px",
      transition: "all 40ms ease-out",
    });
    document.documentElement.appendChild(el);
  }
  return el;
}

function ensureBanner(text: string): HTMLDivElement {
  let el = document.getElementById(BANNER_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = BANNER_ID;
    Object.assign(el.style, {
      position: "fixed",
      top: "12px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      padding: "8px 14px",
      borderRadius: "8px",
      background: "#1677ff",
      color: "#fff",
      font:
        '13px/1.4 "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
      pointerEvents: "none",
    });
    document.documentElement.appendChild(el);
  }
  el.textContent = text;
  return el;
}

function positionHighlight(highlight: HTMLDivElement, box: Element): void {
  const rect = box.getBoundingClientRect();
  Object.assign(highlight.style, {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 4)}px`,
    height: `${Math.max(rect.height, 4)}px`,
    display: "block",
  });
}

function hideHighlight(highlight: HTMLDivElement): void {
  highlight.style.display = "none";
}

function cleanupUi(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  document.getElementById(HIGHLIGHT_ID)?.remove();
  document.getElementById(BANNER_ID)?.remove();
  document.body.style.cursor = "";
}

function stopPick(result: PickScanResult | null): void {
  if (onMove) {
    document.removeEventListener("mousemove", onMove, true);
  }
  if (onClick) {
    document.removeEventListener("click", onClick, true);
  }
  if (onKey) {
    document.removeEventListener("keydown", onKey, true);
  }
  onMove = null;
  onClick = null;
  onKey = null;
  cleanupUi();

  const resolve = activeResolve;
  activeResolve = null;
  resolve?.(result);
}

function pickControlResult(target: Element): PickScanResult | null {
  const control = resolvePickControl(target);
  if (!control) {
    return null;
  }
  const field = scannedFieldFromElement(control);
  const host = pickHighlightHost(control);
  return {
    fields: [field],
    rootSelector: markScanRoot(host),
    fieldCount: 1,
    url: location.href,
    element: control,
  };
}

/** Enter inspector-style pick mode; resolves when user clicks a section/control or cancels. */
export function startElementPicker(
  options: StartPickerOptions = {},
): Promise<PickScanResult | null> {
  const mode = options.mode ?? "section";
  const announceScan = options.announceScan ?? true;
  const bannerText =
    options.bannerText ?? (mode === "control" ? CONTROL_BANNER : SECTION_BANNER);

  // Cancel any prior session
  if (activeResolve) {
    stopPick(null);
  }

  ensureBanner(bannerText);
  const highlight = ensureHighlight();
  document.body.style.cursor = "crosshair";

  return new Promise((resolve) => {
    activeResolve = resolve;

    onMove = (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof Element) || isPickerChrome(target)) {
        return;
      }

      if (mode === "control") {
        const control = resolvePickControl(target);
        if (!control) {
          hideHighlight(highlight);
          return;
        }
        positionHighlight(highlight, pickHighlightHost(control));
        return;
      }

      const root = resolvePickRoot(target);
      positionHighlight(highlight, root);
    };

    onClick = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = ev.target;
      if (!(target instanceof Element)) {
        stopPick(null);
        return;
      }
      if (isPickerChrome(target)) {
        return;
      }

      if (mode === "control") {
        const result = pickControlResult(target);
        if (!result) {
          showPageToast("Click an input, textarea, or select", "error");
          return;
        }
        stopPick(result);
        return;
      }

      try {
        const scanned = scanFromElement(target);
        const result: PickScanResult = {
          ...scanned,
          url: location.href,
        };
        stopPick(result);
        if (announceScan) {
          showPageToast(
            `Autofill: scanned ${result.fieldCount} field(s) in selected section`,
            result.fieldCount > 0 ? "success" : "error",
          );
        }
      } catch (error) {
        stopPick(null);
        showPageToast(
          error instanceof Error ? error.message : "Pick scan failed",
          "error",
        );
      }
    };

    onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        stopPick(null);
        showPageToast("Autofill: pick cancelled", "info");
      }
    };

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
  });
}

export function cancelElementPicker(): void {
  if (activeResolve) {
    stopPick(null);
  }
}

export function isPickerActive(): boolean {
  return activeResolve != null;
}
