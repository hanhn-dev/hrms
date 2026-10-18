import { locateSource, type SourceLocation } from "./locate.ts";

export const INSPECT_EVENT_TYPES = ["pointerdown", "mousedown", "mouseup", "pointerup", "click", "dblclick"] as const;

export function takeInspectEvent(event: MouseEvent, pinned: boolean): SourceLocation | null {
  if (event.button !== 0 || !(pinned || (event.shiftKey && event.altKey))) return null;
  const target = eventTargetElement(event);
  if (target?.closest("[data-inspector-chrome]") != null) return null;
  const element = hitElement(event);
  if (element == null || element.closest("[data-inspector-chrome]") != null) return null;
  // preventDefault on pointerdown cancels the click that follows, so the editor never opens.
  if (event.type === "click") event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  if (event.type !== "click") return null;
  return locateSource(element);
}

function hitElement(event: MouseEvent): Element | null {
  return eventTargetElement(event);
}

function eventTargetElement(event: MouseEvent): Element | null {
  const target = event.target;
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}
