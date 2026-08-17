"use client";

import { useRouter } from "next/navigation";
import type { FeatureVersion } from "@/lib/features";

export function VersionSelect({
  versions,
  currentSlug,
}: {
  versions: FeatureVersion[];
  currentSlug: string;
}): React.JSX.Element | null {
  const router = useRouter();
  const archives = versions.filter((version) => !version.current);
  if (archives.length === 0) return null;

  const selected = versions.find((version) => version.slug === currentSlug) ?? versions[0];

  return (
    <label className="mt-2 flex items-center gap-2 text-sm font-normal text-slate-500 dark:text-slate-400">
      <span className="shrink-0">Version</span>
      <select
        className="max-w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        onChange={(event) => {
          router.push(event.target.value);
        }}
        value={selected?.href ?? versions[0]?.href}
      >
        {versions.map((version) => (
          <option key={version.slug} value={version.href}>
            {version.current ? `Latest (${version.date})` : version.date}
          </option>
        ))}
      </select>
    </label>
  );
}
