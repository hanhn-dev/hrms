export type ProgressPrMode = "preset" | "sprint" | "custom";

export type ProgressPrPreset = "1w" | "2w" | "3w" | "1m" | "3m";

export const DEFAULT_PROGRESS_PR_MODE: ProgressPrMode = "preset";
export const DEFAULT_PROGRESS_PR_PRESET: ProgressPrPreset = "1w";

export const PROGRESS_PR_PRESET_OPTIONS = [
  { value: "1w", label: "Last week" },
  { value: "2w", label: "Last 2 weeks" },
  { value: "3w", label: "Last 3 weeks" },
  { value: "1m", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
] as const satisfies readonly { value: ProgressPrPreset; label: string }[];

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Inclusive rolling windows ending today (local calendar). */
export function resolvePresetRange(
  preset: ProgressPrPreset,
  now: Date = new Date(),
): { from: string; to: string } {
  const to = startOfLocalDay(now);
  const from = new Date(to);
  switch (preset) {
    case "1w":
      from.setDate(from.getDate() - 6);
      break;
    case "2w":
      from.setDate(from.getDate() - 13);
      break;
    case "3w":
      from.setDate(from.getDate() - 20);
      break;
    case "1m":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3m":
      from.setMonth(from.getMonth() - 3);
      break;
  }
  return { from: formatYmd(from), to: formatYmd(to) };
}

export function parseProgressPrMode(value: string | undefined): ProgressPrMode {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "sprint") {
    return "sprint";
  }
  if (normalized === "custom") {
    return "custom";
  }
  return DEFAULT_PROGRESS_PR_MODE;
}

export function parseProgressPrPreset(value: string | undefined): ProgressPrPreset {
  const normalized = value?.trim().toLowerCase() ?? "";
  const match = PROGRESS_PR_PRESET_OPTIONS.find((option) => option.value === normalized);
  return match?.value ?? DEFAULT_PROGRESS_PR_PRESET;
}

export function progressPrPresetLabel(preset: ProgressPrPreset): string {
  return (
    PROGRESS_PR_PRESET_OPTIONS.find((option) => option.value === preset)?.label ??
    "Last week"
  );
}
