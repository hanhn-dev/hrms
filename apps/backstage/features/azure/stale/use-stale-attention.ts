"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { WorkItemStateAge, WorkItemSummary } from "@hrms/azure-devops";
import { loadStateAges } from "@/features/azure/stale/load-state-ages";
import {
  parseStaleDays,
  resolveStaleDays,
  writeStaleDaysPreference,
  type StaleDays,
} from "@/features/azure/stale/stale-days-preference";
import {
  collectActiveWorkItemIds,
  findStaleWorkItems,
  staleDaysById,
  type StaleWorkItem,
} from "@/features/azure/stale/stale-work-items";

export type UseStaleAttentionResult = {
  readonly staleDays: StaleDays;
  readonly setStaleDays: (days: StaleDays) => void;
  readonly urlHasStaleDays: boolean;
  readonly staleItems: readonly StaleWorkItem[];
  readonly daysById: ReadonlyMap<number, number | null>;
  readonly loading: boolean;
  readonly error: string | null;
};

export function useStaleAttention(
  workItems: readonly WorkItemSummary[],
): UseStaleAttentionResult {
  const searchParams = useSearchParams();
  const urlValue = searchParams.get("staleDays");
  const urlHasStaleDays = parseStaleDays(urlValue) != null;
  const [staleDays, setStaleDaysState] = useState<StaleDays>(() =>
    resolveStaleDays({ urlValue }),
  );
  const [ages, setAges] = useState<ReadonlyMap<number, WorkItemStateAge>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStaleDaysState(resolveStaleDays({ urlValue }));
  }, [urlValue]);

  const activeIds = collectActiveWorkItemIds(workItems);
  const activeKey = activeIds.join(",");

  useEffect(() => {
    if (activeIds.length === 0) {
      setAges(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadStateAges(activeIds)
      .then((rows) => {
        if (cancelled) {
          return;
        }
        setAges(new Map(rows.map((row) => [row.workItemId, row])));
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        setAges(new Map());
        setLoading(false);
        setError(
          loadError instanceof Error ? loadError.message : "Could not load state ages.",
        );
      });

    return () => {
      cancelled = true;
    };
    // activeKey tracks membership of activeIds; listing activeIds would churn every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on id-set key
  }, [activeKey]);

  function setStaleDays(days: StaleDays): void {
    writeStaleDaysPreference(days);
    setStaleDaysState(days);
  }

  const staleItems = findStaleWorkItems(workItems, ages, staleDays);

  return {
    staleDays,
    setStaleDays,
    urlHasStaleDays,
    staleItems,
    daysById: staleDaysById(staleItems),
    loading,
    error,
  };
}
