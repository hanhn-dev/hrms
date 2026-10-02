"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "antd";
import { openChangeRequestFromClick } from "@/features/employer/workflows/change-request-id-click";
import { getChangeRequestDetail } from "@/features/employer/workflows/change-request-actions";
import { ChangeRequestDetailModal } from "@/features/employer/workflows/change-request-detail-modal";
import type { ChangeRequestDetail } from "@/features/employer/workflows/queries";

export function ChangeRequestIdButton({
  changeRequestId,
  onOpen,
}: {
  changeRequestId: number;
  onOpen: (changeRequestId: number) => void;
}): React.JSX.Element {
  return (
    <Button
      className="!px-0"
      size="small"
      type="link"
      onClick={(event) => {
        openChangeRequestFromClick(event, changeRequestId, onOpen);
      }}
    >
      {changeRequestId}
    </Button>
  );
}

export function useChangeRequestView(
  employerId: number,
  options?: { onClose?: () => void },
): {
  openView: (changeRequestId: number) => Promise<void>;
  hide: () => void;
  selectedId: number | null;
  modal: React.JSX.Element;
} {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ChangeRequestDetail | null>(null);
  const [queryScript, setQueryScript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const onCloseRef = useRef(options?.onClose);
  onCloseRef.current = options?.onClose;
  const loadedRef = useRef<{ id: number; detail: ChangeRequestDetail } | null>(null);
  const requestSeq = useRef(0);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  const openView = useCallback(
    async (changeRequestId: number): Promise<void> => {
      setOpen(true);
      setSelectedId(changeRequestId);
      if (loadedRef.current?.id === changeRequestId) {
        setDetail(loadedRef.current.detail);
        return;
      }
      const seq = requestSeq.current + 1;
      requestSeq.current = seq;
      loadedRef.current = null;
      setDetail(null);
      setQueryScript("");
      setError(null);
      setLoading(true);
      try {
        const result = await getChangeRequestDetail(employerId, changeRequestId);
        if (requestSeq.current !== seq) {
          return;
        }
        loadedRef.current = { id: changeRequestId, detail: result.detail };
        setDetail(result.detail);
        setQueryScript(result.queryScript);
      } catch (loadError) {
        if (requestSeq.current !== seq) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load change request.",
        );
      } finally {
        if (requestSeq.current === seq) {
          setLoading(false);
        }
      }
    },
    [employerId],
  );

  const dismiss = useCallback(() => {
    setOpen(false);
    onCloseRef.current?.();
  }, []);

  const modal = (
    <ChangeRequestDetailModal
      detail={open ? detail : null}
      employerId={employerId}
      error={open ? error : null}
      loading={open && loading}
      open={open}
      queryScript={queryScript}
      onClose={dismiss}
    />
  );

  return { openView, hide, selectedId, modal };
}
