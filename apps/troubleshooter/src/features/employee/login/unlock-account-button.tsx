"use client";

import { useRouter } from "next/navigation";
import {
  commitUnlockAccount,
  previewUnlockAccount,
} from "@/features/employee/login/mutations";
import { ConfirmWriteModal } from "@/shared/ui";

export function UnlockAccountButton({
  employerId,
  employmentNumber,
  disabled,
  disabledReason,
}: {
  employerId: number;
  employmentNumber: string;
  disabled?: boolean;
  disabledReason?: string;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <ConfirmWriteModal
      buttonLabel="Unlock account"
      disabled={disabled}
      disabledReason={disabledReason}
      title="Unlock account"
      previewAction={() =>
        previewUnlockAccount({ employerId, employmentNumber })
      }
      commitAction={commitUnlockAccount}
      onDone={() => {
        router.refresh();
      }}
    />
  );
}
