"use client";

import { Alert, Modal, Spin } from "antd";
import { ChangeRequestSummary } from "@/features/employer/workflows/change-request-summary";
import type { ChangeRequestDetail } from "@/features/employer/workflows/queries";

export function ChangeRequestDetailModal({
  open,
  loading,
  error,
  employerId,
  detail,
  queryScript,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  employerId: number;
  detail: ChangeRequestDetail | null;
  queryScript: string;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={open}
      title={
        detail
          ? `Change request ${detail.header.changeRequestId}`
          : "Change request"
      }
      width={840}
      onCancel={onClose}
    >
      {error ? <Alert className="mb-3" showIcon type="error" title={error} /> : null}
      {loading && !detail ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : null}
      {detail ? (
        <ChangeRequestSummary
          detail={detail}
          employerId={employerId}
          queryScript={queryScript}
        />
      ) : null}
    </Modal>
  );
}
