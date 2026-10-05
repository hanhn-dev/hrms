"use client";

import { useRouter } from "next/navigation";
import {
  commitResetPassword,
  previewResetPassword,
} from "@/features/employee/login/mutations";
import { ConfirmWriteModal } from "@/shared/ui";

export function ResetPasswordButton({
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
      buttonLabel="Reset password"
      disabled={disabled}
      disabledReason={disabledReason}
      title="Reset password"
      successMessage="Password reset to welcome123#."
      previewAction={() =>
        previewResetPassword({ employerId, employmentNumber })
      }
      commitAction={commitResetPassword}
      onDone={() => {
        router.refresh();
      }}
    />
  );
}
