export const TYPE_HIGHLIGHT_ID = "form-autofill-type-highlight";

let generation = 0;
let highlighted: Element | null = null;
let onReposition: (() => void) | null = null;

function isHighlightable(root: ParentNode): root is Element {
  if (!(root instanceof Element)) {
    return false;
  }
  if (root === document.documentElement || root === document.body) {
    return false;
  }
  return true;
}

function ensureHighlight(): HTMLDivElement {
  let el = document.getElementById(TYPE_HIGHLIGHT_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = TYPE_HIGHLIGHT_ID;
    Object.assign(el.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "2147483646",
      border: "2px solid #1677ff",
      background: "rgba(22, 119, 255, 0.12)",
      borderRadius: "4px",
    });
    document.documentElement.appendChild(el);
  }
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

function detachListeners(): void {
  if (onReposition) {
    window.removeEventListener("scroll", onReposition, true);
    window.removeEventListener("resize", onReposition);
    onReposition = null;
  }
}

/** Paint a pick-style overlay on the form/section being typed. Returns a session id. */
export function startTypeHighlight(root: ParentNode): number {
  endTypeHighlight();
  generation += 1;
  const sessionId = generation;
  if (!isHighlightable(root)) {
    return sessionId;
  }

  highlighted = root;
  const overlay = ensureHighlight();
  positionHighlight(overlay, root);
  onReposition = () => {
    const box = document.getElementById(
      TYPE_HIGHLIGHT_ID,
    ) as HTMLDivElement | null;
    if (box && highlighted) {
      positionHighlight(box, highlighted);
    }
  };
  window.addEventListener("scroll", onReposition, true);
  window.addEventListener("resize", onReposition);
  return sessionId;
}

/** Remove the type overlay. A stale session id is ignored so a newer job keeps its box. */
export function endTypeHighlight(sessionId?: number): void {
  if (sessionId != null && sessionId !== generation) {
    return;
  }
  detachListeners();
  highlighted = null;
  document.getElementById(TYPE_HIGHLIGHT_ID)?.remove();
}

export function isTypeHighlightActive(): boolean {
  return document.getElementById(TYPE_HIGHLIGHT_ID) != null;
}
