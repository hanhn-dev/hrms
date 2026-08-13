"use client";

import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false });

const MIN_SCALE = 0.5;
const MAX_SCALE = 6;
const ZOOM_STEP = 1.2;

type Transform = { scale: number; x: number; y: number };

export function Mermaid({ chart }: { chart: string }): React.JSX.Element {
  const id = useId().replace(/:/g, "-");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const applyTransform = () => {
    const { scale, x, y } = transformRef.current;
    if (contentRef.current) {
      contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
  };

  const resetTransform = () => {
    transformRef.current = { scale: 1, x: 0, y: 0 };
    applyTransform();
  };

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const { scale, x, y } = transformRef.current;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const ratio = nextScale / scale;
    transformRef.current = {
      scale: nextScale,
      x: mouseX - (mouseX - x) * ratio,
      y: mouseY - (mouseY - y) * ratio,
    };
    applyTransform();
  };

  const zoomAtCenter = (factor: number) => {
    const rect = bodyRef.current?.getBoundingClientRect();
    if (rect) zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };

  useEffect(() => {
    let cancelled = false;
    mermaid
      .render(`mermaid-${id}`, chart)
      .then(({ svg }) => {
        if (!cancelled && contentRef.current) {
          contentRef.current.innerHTML = svg;
          resetTransform();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
      resetTransform();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (error) {
    return (
      <pre className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to render diagram: {error}
      </pre>
    );
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      wrapperRef.current?.requestFullscreen();
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isFullscreen || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFullscreen || e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const { x: origX, y: origY } = transformRef.current;
    if (bodyRef.current) bodyRef.current.style.cursor = "grabbing";

    const onMouseMove = (moveEvent: MouseEvent) => {
      transformRef.current = {
        ...transformRef.current,
        x: origX + (moveEvent.clientX - startX),
        y: origY + (moveEvent.clientY - startY),
      };
      applyTransform();
    };
    const onMouseUp = () => {
      if (bodyRef.current) bodyRef.current.style.cursor = "grab";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="mermaid-diagram group relative" ref={wrapperRef}>
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isFullscreen && (
          <>
            <button
              aria-label="Zoom out"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white/90 text-sm font-medium text-slate-500 shadow-sm hover:text-slate-700"
              onClick={() => zoomAtCenter(1 / ZOOM_STEP)}
              type="button"
            >
              −
            </button>
            <button
              aria-label="Reset zoom"
              className="flex h-7 items-center justify-center rounded-md border border-slate-200 bg-white/90 px-2 text-xs font-medium text-slate-500 shadow-sm hover:text-slate-700"
              onClick={resetTransform}
              type="button"
            >
              Reset
            </button>
            <button
              aria-label="Zoom in"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white/90 text-sm font-medium text-slate-500 shadow-sm hover:text-slate-700"
              onClick={() => zoomAtCenter(ZOOM_STEP)}
              type="button"
            >
              +
            </button>
          </>
        )}
        <button
          aria-label={isFullscreen ? "Exit fullscreen" : "View diagram fullscreen"}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white/90 text-slate-500 shadow-sm hover:text-slate-700"
          onClick={toggleFullscreen}
          type="button"
        >
          {isFullscreen ? (
            <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
              <path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
              <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
      <div className="mermaid-diagram-body overflow-x-auto" onMouseDown={onMouseDown} onWheel={onWheel} ref={bodyRef}>
        <div className="mermaid-diagram-content" ref={contentRef} />
      </div>
    </div>
  );
}
