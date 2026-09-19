import type { ScannedField } from "@/shared/messaging";
import { collectElements, scanFields } from "./scan-fields";

/**
 * Count logical form fields (FormControl-grouped), not raw DOM inputs.
 */
export function countFillableControls(root: ParentNode): number {
  return collectElements(root).length;
}

/**
 * Flyout/dialog shells (often `role="dialog"` + `inset-0`) wrap the whole viewport.
 * Use them as a ceiling, never as the highlighted pick root.
 */
const PICK_CEILING_SELECTOR = [
  '[role="dialog"]',
  ".MuiDialog-paper",
  ".MuiDrawer-paper",
  ".MuiModal-root",
].join(", ");

function isPickCeiling(el: Element): boolean {
  try {
    return el.matches(PICK_CEILING_SELECTOR);
  } catch {
    return false;
  }
}

function findPickCeiling(el: Element): Element | null {
  try {
    return el.closest(PICK_CEILING_SELECTOR);
  } catch {
    return null;
  }
}

function looksLikeFormSection(el: Element): boolean {
  if (isPickCeiling(el)) {
    return false;
  }
  const cls = typeof el.className === "string" ? el.className : "";
  if (cls.includes("space-y")) {
    return true;
  }
  if (
    el.classList?.contains("MuiPaper-root") ||
    el.classList?.contains("MuiCard-root")
  ) {
    return true;
  }
  if (
    el.querySelector(
      "h1, h2, h3, h4, .MuiTypography-h6, .MuiTypography-subtitle1",
    ) &&
    countFillableControls(el) >= 5
  ) {
    return true;
  }
  return false;
}

/**
 * Prefer the tightest form section around the click (e.g. Past employment details),
 * not a page shell / flyout overlay that wraps the whole viewport.
 */
export function resolvePickRoot(clicked: Element): Element {
  const start =
    (clicked.closest(
      "input, textarea, select, label, .MuiFormControl-root, .MuiTextField-root",
    ) as Element | null) ?? clicked;

  const ceiling = findPickCeiling(start);

  let node: Element | null = start;
  while (node && node !== document.documentElement && node !== document.body) {
    if (ceiling && node === ceiling) {
      break;
    }
    const count = countFillableControls(node);
    if (looksLikeFormSection(node) && count >= 2) {
      return node;
    }
    const heading = node.querySelector("h1, h2, h3, h4");
    if (
      heading &&
      /details/i.test(heading.textContent || "") &&
      count >= 2
    ) {
      return node;
    }
    node = node.parentElement;
  }

  const chain: Array<{ el: Element; count: number }> = [];
  node = start;
  while (node && node !== document.documentElement && node !== document.body) {
    if (ceiling && node === ceiling) {
      break;
    }
    chain.push({ el: node, count: countFillableControls(node) });
    node = node.parentElement;
  }

  if (chain.length === 0) {
    if (ceiling && countFillableControls(ceiling) >= 2) {
      return ceiling;
    }
    return start;
  }

  const maxCount = Math.max(...chain.map((c) => c.count), 0);
  if (maxCount === 0) {
    return start;
  }

  // Cap growth: once we have a solid section (8+), don't expand to pull in siblings
  const solid = chain.find((c) => c.count >= 8 && c.count <= 24);
  if (solid) {
    return solid.el;
  }

  const threshold = Math.max(2, Math.floor(maxCount * 0.85));
  const match = chain.find((c) => c.count >= threshold);
  return match?.el ?? chain[chain.length - 1]!.el;
}

const ROOT_ATTR = "data-form-autofill-root";

export function markScanRoot(root: Element): string {
  document.querySelectorAll(`[${ROOT_ATTR}]`).forEach((el) => {
    el.removeAttribute(ROOT_ATTR);
  });
  root.setAttribute(ROOT_ATTR, "1");
  return `[${ROOT_ATTR}="1"]`;
}

export function getMarkedScanRoot(): Element | null {
  return document.querySelector(`[${ROOT_ATTR}="1"]`);
}

export function scanFromElement(clicked: Element): {
  fields: ScannedField[];
  rootSelector: string;
  fieldCount: number;
} {
  const root = resolvePickRoot(clicked);
  const rootSelector = markScanRoot(root);
  const fields = scanFields({ root });
  return { fields, rootSelector, fieldCount: fields.length };
}
