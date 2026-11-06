"use client";

import { DatePicker, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  DEFAULT_TRACKING_PR_PRESET,
  TRACKING_PR_PRESET_OPTIONS,
  trackingPrPresetLabel,
  resolvePresetRange,
  type TrackingPrMode,
  type TrackingPrPreset,
} from "@/features/azure/pull-requests/tracking-range";
import { formatDate } from "@/shared/format-date";

export type { TrackingPrMode, TrackingPrPreset };

/** Select value space: preset ids + sprint + custom. */
type PeriodSelectValue = TrackingPrPreset | "sprint" | "custom";

function selectValue(mode: TrackingPrMode, preset: TrackingPrPreset): PeriodSelectValue {
  if (mode === "sprint") {
    return "sprint";
  }
  if (mode === "custom") {
    return "custom";
  }
  return preset;
}

const PERIOD_OPTIONS: { label: string; value: PeriodSelectValue }[] = [
  ...TRACKING_PR_PRESET_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value as PeriodSelectValue,
  })),
  { label: "Sprint", value: "sprint" },
  { label: "Custom range", value: "custom" },
];

export function TrackingPrPeriodControls({
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
  mode: TrackingPrMode;
  preset: TrackingPrPreset;
  sprintStart: string | null;
  sprintFinish: string | null;
  customFrom: string | null;
  customTo: string | null;
  disabled?: boolean;
  onModeChange: (mode: TrackingPrMode) => void;
  onPresetChange: (preset: TrackingPrPreset) => void;
  onCustomRangeChange: (from: string | null, to: string | null) => void;
}): React.JSX.Element {
  const sprintLabel =
    sprintStart != null && sprintFinish != null
      ? `${formatDate(sprintStart)} – ${formatDate(sprintFinish)}`
      : "Sprint has no dates";

  const activePreset = mode === "preset" ? preset : DEFAULT_TRACKING_PR_PRESET;
  const presetRange = resolvePresetRange(activePreset);
  const presetHint = `${trackingPrPresetLabel(activePreset)} · ${formatDate(presetRange.from)} – ${formatDate(presetRange.to)}`;

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
