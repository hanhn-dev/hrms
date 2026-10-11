"use client";

import { useEffect, useState } from "react";
import { EDITOR_SETTING, readEditor } from "@/features/flows/editor-preference";
import { FLOW_ROOTS_SETTING, readRoots, ROOTS_KEY } from "@/features/flows/roots-storage";
import type { SourceCitation } from "@/features/flows/source-citation";
import { getSetting, migrateLocalSetting } from "@/shared/client-db";

export function SourceCodeLink({
  citation,
  label,
}: {
  citation: SourceCitation;
  label: string;
}): React.JSX.Element {
  const [href, setHref] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  const { repo, path: filePath, line, column } = citation;

  useEffect(() => {
    let cancelled = false;
    const source = { repo, path: filePath, line, column };
    void (async () => {
      let roots = readRoots(await migrateLocalSetting(FLOW_ROOTS_SETTING, ROOTS_KEY).catch(() => undefined));
      try {
        const response = await fetch("/api/flows/roots");
        const payload = (await response.json()) as { roots?: typeof roots };
        roots = { ...payload.roots, ...roots };
      } catch {
        // A saved checkout folder is enough when the server has no default roots.
      }
      const editor = await getSetting(EDITOR_SETTING)
        .then(readEditor)
        .catch(() => readEditor(undefined));
      const response = await fetch("/api/flows/files", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roots,
          editor,
          files: [{ id: "cite", source }],
        }),
      });
      const payload = (await response.json()) as { hrefs?: Record<string, string | null> };
      if (cancelled) return;
      setHref(payload.hrefs?.cite ?? null);
      setResolved(true);
    })().catch(() => {
      if (!cancelled) setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repo, filePath, line, column]);

  if (href) {
    return (
      <a className="text-sky-700 underline dark:text-sky-300" href={href} title="Open this file">
        <code>{label}</code>
      </a>
    );
  }

  return (
    <code title={resolved ? "Set this checkout under Settings to open the file." : undefined}>{label}</code>
  );
}
