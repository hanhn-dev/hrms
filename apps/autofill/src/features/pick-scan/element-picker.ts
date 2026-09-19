import { resolvePickRoot, scanFromElement } from "@/features/scan/resolve-pick-root";
import { showPageToast } from "@/shared/page-toast";

const OVERLAY_ID = "form-autofill-pick-overlay";
const HIGHLIGHT_ID = "form-autofill-pick-highlight";
const BANNER_ID = "form-autofill-pick-banner";

export type PickScanResult = {
  fields: ReturnType<typeof scanFromElement>["fields"];
  rootSelector: string;
  fieldCount: number;
  url: string;
};

type PickResolve = (result: PickScanResult | null) => void;

let activeResolve: PickResolve | null = null;
let onMove: ((ev: MouseEvent) => void) | null = null;
let onClick: ((ev: MouseEvent) => void) | null = null;
let onKey: ((ev: KeyboardEvent) => void) | null = null;

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

function ensureBanner(): HTMLDivElement {
  let el = document.getElementById(BANNER_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = BANNER_ID;
    el.textContent =
      "Click the form section (blue box = scan area) · Esc cancels";
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
  return el;
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

/** Enter inspector-style pick mode; resolves when user clicks a section or cancels. */
export function startElementPicker(): Promise<PickScanResult | null> {
  // Cancel any prior session
  if (activeResolve) {
    stopPick(null);
  }

  ensureBanner();
  const highlight = ensureHighlight();
  document.body.style.cursor = "crosshair";

  return new Promise((resolve) => {
    activeResolve = resolve;

    onMove = (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (
        target.id === HIGHLIGHT_ID ||
        target.id === BANNER_ID ||
        target.closest(`#${BANNER_ID}`)
      ) {
        return;
      }
      // Highlight the section that would actually be scanned (not just the hovered node)
      const root = resolvePickRoot(target);
      const rect = root.getBoundingClientRect();
      Object.assign(highlight.style, {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 4)}px`,
        height: `${Math.max(rect.height, 4)}px`,
        display: "block",
      });
    };

    onClick = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = ev.target;
      if (!(target instanceof Element)) {
        stopPick(null);
        return;
      }
      if (target.id === BANNER_ID || target.id === HIGHLIGHT_ID) {
        return;
      }

      try {
        const scanned = scanFromElement(target);
        const result: PickScanResult = {
          ...scanned,
          url: location.href,
        };
        stopPick(result);
        showPageToast(
          `Autofill: scanned ${result.fieldCount} field(s) in selected section`,
          result.fieldCount > 0 ? "success" : "error",
        );
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
