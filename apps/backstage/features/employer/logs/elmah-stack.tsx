"use client";

import { useEffect, useState } from "react";
import { loadElmahStack } from "@/features/employer/logs/elmah-actions";

export function ElmahStack({
  employerId,
  errorId,
}: {
  employerId: number;
  errorId: string;
}): React.JSX.Element {
  const [stack, setStack] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStack(null);
    setFailed(false);
    void loadElmahStack(employerId, errorId)
      .then((next) => {
        if (!cancelled) {
          setStack(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [employerId, errorId]);

  if (failed) {
    return <p>The stack trace could not be loaded.</p>;
  }
  if (stack == null) {
    return <p>Loading stack trace…</p>;
  }
  return <pre className="max-w-full whitespace-pre-wrap text-xs">{stack}</pre>;
}
