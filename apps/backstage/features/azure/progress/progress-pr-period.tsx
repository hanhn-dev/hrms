"use client";

import { DatePicker, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  DEFAULT_PROGRESS_PR_PRESET,
  PROGRESS_PR_PRESET_OPTIONS,
  progressPrPresetLabel,
  resolvePresetRange,
  type ProgressPrMode,
  type ProgressPrPreset,
} from "@/features/azure/progress/progress-pr-range";
import { formatDate } from "@/shared/format-date";

export type { ProgressPrMode, ProgressPrPreset };

/** Select value space: preset ids + sprint + custom. */
type PeriodSelectValue = ProgressPrPreset | "sprint" | "custom";

function selectValue(mode: ProgressPrMode, preset: ProgressPrPreset): PeriodSelectValue {
  if (mode === "sprint") {
    return "sprint";
  }
  if (mode === "custom") {
    return "custom";
  }
  return preset;
}

const PERIOD_OPTIONS: { label: string; value: PeriodSelectValue }[] = [
  ...PROGRESS_PR_PRESET_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value as PeriodSelectValue,
  })),
  { label: "Sprint", value: "sprint" },
  { label: "Custom range", value: "custom" },
];

export function ProgressPrPeriodControls({
  mode,
  preset,
  sprintStart,
  sprintFinish,
  customFrom,
  customTo,
  disabled,
  onModeChange,
  onPresetChange,
  onCustomRangeChange,
}: {
  mode: ProgressPrMode;
  preset: ProgressPrPreset;
  sprintStart: string | null;
  sprintFinish: string | null;
  customFrom: string | null;
  customTo: string | null;
  disabled?: boolean;
  onModeChange: (mode: ProgressPrMode) => void;
  onPresetChange: (preset: ProgressPrPreset) => void;
  onCustomRangeChange: (from: string | null, to: string | null) => void;
}): React.JSX.Element {
  const sprintLabel =
    sprintStart != null && sprintFinish != null
      ? `${formatDate(sprintStart)} – ${formatDate(sprintFinish)}`
      : "Sprint has no dates";

  const activePreset = mode === "preset" ? preset : DEFAULT_PROGRESS_PR_PRESET;
  const presetRange = resolvePresetRange(activePreset);
  const presetHint = `${progressPrPresetLabel(activePreset)} · ${formatDate(presetRange.from)} – ${formatDate(presetRange.to)}`;

  const rangeValue: [Dayjs | null, Dayjs | null] | null =
    customFrom != null || customTo != null
      ? [customFrom ? dayjs(customFrom) : null, customTo ? dayjs(customTo) : null]
      : null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-600">Period</span>
      <Select
        className="min-w-44"
        disabled={disabled}
        options={PERIOD_OPTIONS}
        value={selectValue(mode, preset)}
        onChange={(value: PeriodSelectValue) => {
          if (value === "sprint") {
            onModeChange("sprint");
            return;
          }
          if (value === "custom") {
            onModeChange("custom");
            return;
          }
          // Preset choice also switches mode to Quick (omitted from URL when default).
          onPresetChange(value);
        }}
      />
      {mode === "preset" ? (
        <span className="text-sm text-slate-500">{presetHint}</span>
      ) : null}
      {mode === "sprint" ? <span className="text-sm text-slate-500">{sprintLabel}</span> : null}
      {mode === "custom" ? (
        <DatePicker.RangePicker
          allowEmpty={[true, true]}
          disabled={disabled}
          value={rangeValue}
          onChange={(dates) => {
            const from = dates?.[0]?.format("YYYY-MM-DD") ?? null;
            const to = dates?.[1]?.format("YYYY-MM-DD") ?? null;
            onCustomRangeChange(from, to);
          }}
        />
      ) : null}
    </div>
  );
}
