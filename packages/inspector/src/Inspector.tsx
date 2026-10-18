"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { INSPECT_EVENT_TYPES, takeInspectEvent } from "./inspect-event.ts";
import { locateSource, type SourceLocation } from "./locate.ts";

type Highlight = SourceLocation & {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function Inspector(): JSX.Element | null {
  const enabled = process.env.NODE_ENV === "development";
  const pinnedRef = useRef(false);
  const holdingRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [pinned, setPinned] = useState(false);
  const [holding, setHolding] = useState(false);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const active = pinned || holding;

  useEffect(() => {
    if (!enabled) return;

    function activeNow(): boolean {
      return pinnedRef.current || holdingRef.current;
    }

    function refresh(x: number, y: number): void {
      pointerRef.current = { x, y };
      setHighlight(activeNow() ? highlightAt(x, y) : null);
    }

    function onKey(event: KeyboardEvent): void {
      holdingRef.current = event.shiftKey && event.altKey;
      setHolding(holdingRef.current);
      refresh(pointerRef.current.x, pointerRef.current.y);
    }

    function onMove(event: MouseEvent): void {
      holdingRef.current = event.shiftKey && event.altKey;
      setHolding(holdingRef.current);
      refresh(event.clientX, event.clientY);
    }

    function onInspectEvent(event: Event): void {
      if (!(event instanceof MouseEvent)) return;
      if (event.type === "pointerdown" && event.button === 0 && activeNow()) {
        const target = event.target instanceof Element ? event.target : null;
        const preview = target?.closest("[data-inspector-chrome]") == null && target != null ? locateSource(target) : null;
        if (preview != null) void openSource(preview, true);
      }
      const source = takeInspectEvent(event, activeNow());
      if (source == null) return;
      void openSource(source).then((error) => {
        setNotice(error);
      });
    }

    function onBlur(): void {
      holdingRef.current = false;
      setHolding(false);
      if (!pinnedRef.current) setHighlight(null);
    }

    function onScroll(): void {
      refresh(pointerRef.current.x, pointerRef.current.y);
    }

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("blur", onBlur);
    document.addEventListener("mousemove", onMove, true);
    for (const type of INSPECT_EVENT_TYPES) window.addEventListener(type, onInspectEvent, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMove, true);
      for (const type of INSPECT_EVENT_TYPES) window.removeEventListener(type, onInspectEvent, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled]);

  if (!enabled) return null;

  const labelTop = highlight != null && highlight.top > 28 ? highlight.top - 24 : highlight?.top ?? 0;

  return (
    <>
      {highlight != null ? (
        <div
          data-inspector-chrome=""
          style={{
            position: "fixed",
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            boxSizing: "border-box",
            border: "2px solid #1677ff",
            background: "rgba(22, 119, 255, 0.12)",
            pointerEvents: "none",
            zIndex: 2147483646,
          }}
        >
          <span
            style={{
              position: "fixed",
              top: labelTop,
              left: highlight.left,
              maxWidth: 480,
              padding: "2px 6px",
              background: "#1677ff",
              color: "#fff",
              font: "12px/1.4 ui-sans-serif, system-ui, sans-serif",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "none",
            }}
          >
            {highlight.file}:{highlight.line}
          </span>
        </div>
      ) : null}
      <button
        type="button"
        data-inspector-chrome=""
        aria-pressed={active}
        title="Shift+Alt+click opens the source line"
        onClick={() => {
          pinnedRef.current = !pinnedRef.current;
          setPinned(pinnedRef.current);
          if (!pinnedRef.current && !holdingRef.current) setHighlight(null);
        }}
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          zIndex: 2147483647,
          padding: "6px 10px",
          border: 0,
          borderRadius: 6,
          background: active ? "#1677ff" : "#1f2937",
          color: "#fff",
          font: "12px/1.4 ui-sans-serif, system-ui, sans-serif",
          cursor: "pointer",
        }}
      >
        {notice ?? (active ? "Inspecting" : "Inspect")}
      </button>
    </>
  );
}

function highlightAt(x: number, y: number): Highlight | null {
  const hit = document.elementFromPoint(x, y);
  if (!(hit instanceof Element) || hit.closest("[data-inspector-chrome]")) return null;
  const source = locateSource(hit);
  const host = hit.closest("[data-insp-path]");
  if (source == null || !(host instanceof Element)) return null;
  const rect = host.getBoundingClientRect();
  return {
    ...source,
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

async function openSource(source: SourceLocation, prepare = false): Promise<string | null> {
  try {
    const response = await fetch("/api/inspector", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file: source.file, line: source.line, column: source.column, prepare }),
    });
    if (response.ok) return null;
    const payload: unknown = await response.json();
    if (payload != null && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      return payload.error;
    }
    return "Could not open the editor";
  } catch {
    return "Could not open the editor";
  }
}
