"use client";

import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false });

export function Mermaid({ chart }: { chart: string }): React.JSX.Element {
  const id = useId().replace(/:/g, "-");
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    mermaid
      .render(`mermaid-${id}`, chart)
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <pre className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to render diagram: {error}
      </pre>
    );
  }

  return <div className="overflow-x-auto" ref={containerRef} />;
}
