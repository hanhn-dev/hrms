"use client";

import { useCallback, useRef, useState } from "react";
import type { WorkItem } from "@hrms/azure-devops";
import { getWorkItemDetail } from "@/features/azure/pull-requests/queries";
import { WorkItemDetailModal } from "@/features/azure/pull-requests/work-item-detail-modal";

export function useWorkItemView(): {
  openView: (workItemId: number) => Promise<void>;
  modal: React.JSX.Element;
} {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<WorkItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<number, WorkItem>>(new Map());
  const requestSeq = useRef(0);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  const openView = useCallback(async (workItemId: number): Promise<void> => {
    setOpen(true);
    const cached = cacheRef.current.get(workItemId);
    if (cached) {
      setDetail(cached);
      setError(null);
      return;
    }
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setDetail(null);
    setError(null);
    setLoading(true);
    try {
      const result = await getWorkItemDetail(workItemId);
      if (requestSeq.current !== seq) {
        return;
      }
      cacheRef.current.set(workItemId, result);
      setDetail(result);
    } catch (loadError) {
      if (requestSeq.current !== seq) {
        return;
      }
      setError(loadError instanceof Error ? loadError.message : "Failed to load work item.");
    } finally {
      if (requestSeq.current === seq) {
        setLoading(false);
      }
    }
  }, []);

  const modal = (
    <WorkItemDetailModal
      detail={open ? detail : null}
      error={open ? error : null}
      loading={open && loading}
      open={open}
      onClose={hide}
    />
  );

  return { openView, modal };
}
