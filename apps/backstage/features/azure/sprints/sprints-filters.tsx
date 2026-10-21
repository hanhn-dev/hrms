"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DatePicker, Input, Segmented } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { ProjectTeam, TeamIterationTimeframe } from "@hrms/azure-devops";
import { SearchSelect } from "@/shared/ui";

const TIME_FRAME_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Past", value: "past" },
  { label: "Current", value: "current" },
  { label: "Future", value: "future" },
] as const;

export type SprintsFiltersValues = {
  team: string;
  timeFrame?: TeamIterationTimeframe;
  from?: string;
  to?: string;
  pathPrefix?: string;
  q?: string;
  iteration?: string;
};

export function SprintsFilters({
  teams,
  defaultTeam,
  pathOptions,
  values,
}: {
  teams: ProjectTeam[];
  defaultTeam: string;
  pathOptions: string[];
  values: SprintsFiltersValues;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const selectedTeam = values.team || defaultTeam;
  const dateRange: [Dayjs | null, Dayjs | null] | null =
    values.from || values.to
      ? [values.from ? dayjs(values.from) : null, values.to ? dayjs(values.to) : null]
      : null;

  function updateQuery(patch: Record<string, string | null>): void {
    const current: Record<string, string | null> = {
      team: values.team && values.team !== defaultTeam ? values.team : null,
      timeFrame: values.timeFrame ?? null,
      from: values.from ?? null,
      to: values.to ?? null,
      path: values.pathPrefix ?? null,
      q: values.q ?? null,
      iteration: values.iteration ?? null,
    };

    const merged = { ...current, ...patch };
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value == null || value === "") {
        continue;
      }
      next.set(key, value);
    }

    const query = next.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SearchSelect
        allowClear={selectedTeam !== defaultTeam}
        className="min-w-48"
        disabled={pending}
        options={teams.map((team) => ({ label: team.name, value: team.name }))}
        placeholder="Team"
        value={selectedTeam || undefined}
        onChange={(value: string | null) => {
          updateQuery({
            team: value && value !== defaultTeam ? value : null,
          });
        }}
      />
      <Segmented
        disabled={pending}
        options={[...TIME_FRAME_OPTIONS]}
        value={values.timeFrame ?? "all"}
        onChange={(value) => {
          updateQuery({
            timeFrame: value === "all" ? null : String(value),
          });
        }}
      />
      <DatePicker.RangePicker
        allowEmpty={[true, true]}
        className="min-w-64"
        disabled={pending}
        value={dateRange}
        onChange={(dates) => {
          updateQuery({
            from: dates?.[0]?.format("YYYY-MM-DD") ?? null,
            to: dates?.[1]?.format("YYYY-MM-DD") ?? null,
          });
        }}
      />
      <SearchSelect
        allowClear
        className="min-w-56"
        disabled={pending}
        options={pathOptions.map((path) => ({ label: path, value: path }))}
        placeholder="Path prefix"
        value={values.pathPrefix || undefined}
        onChange={(value: string | null) => {
          updateQuery({ path: value ?? null });
        }}
      />
      <Input.Search
        allowClear
        className="min-w-48 max-w-xs"
        defaultValue={values.q ?? ""}
        disabled={pending}
        key={values.q ?? ""}
        placeholder="Sprint name"
        onSearch={(value) => {
          updateQuery({ q: value.trim().length > 0 ? value.trim() : null });
        }}
      />
    </div>
  );
}
