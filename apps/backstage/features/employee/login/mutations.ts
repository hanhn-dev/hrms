"use server";

import { z } from "zod";
import { listUnlockPreview, resetUserPassword, unlockUserAccount } from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";
import { requireResolvedEmployee } from "@/shared/employee";
import { resetPasswordNote } from "@/features/employee/login/reset-password-note";

const unlockPayloadSchema = z.object({
  action: z.literal("unlock"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  employmentNumber: z.string().min(1),
  employeeId: z.number().int().positive(),
});

export async function previewUnlockAccount(input: {
  employerId: number;
  employmentNumber: string;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const identity = await requireResolvedEmployee(
    input.employerId,
    input.employmentNumber,
  );
  const preview = await listUnlockPreview(await getHrmsDb(), {
    employeeId: identity.employeeId,
    employerId: input.employerId,
  });
  return {
    token: createConfirmToken({
      action: "unlock",
      env,
      employerId: input.employerId,
      employmentNumber: input.employmentNumber,
      employeeId: identity.employeeId,
    }),
    preview,
    note: "Clears TUsers.IsUserIDLocked and InvalidLoginAttemptCount only. Does not reset the password.",
  };
}

export async function commitUnlockAccount(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, unlockPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  await unlockUserAccount(await getHrmsDb(), {
    employeeId: payload.employeeId,
    employerId: payload.employerId,
  });
  return {
    after: await listUnlockPreview(await getHrmsDb(), {
      employeeId: payload.employeeId,
      employerId: payload.employerId,
    }),
    note: "Account unlocked. Ask the employee to sign in again.",
  };
}

const resetPasswordPayloadSchema = z.object({
  action: z.literal("reset-password"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  employmentNumber: z.string().min(1),
  employeeId: z.number().int().positive(),
});

export async function previewResetPassword(input: {
  employerId: number;
  employmentNumber: string;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const identity = await requireResolvedEmployee(
    input.employerId,
    input.employmentNumber,
  );
  const preview = await listUnlockPreview(await getHrmsDb(), {
    employeeId: identity.employeeId,
    employerId: input.employerId,
  });
  return {
    token: createConfirmToken({
      action: "reset-password",
      env,
      employerId: input.employerId,
      employmentNumber: input.employmentNumber,
      employeeId: identity.employeeId,
    }),
    preview,
    note: resetPasswordNote(preview),
  };
}

export async function commitResetPassword(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, resetPasswordPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  await resetUserPassword(await getHrmsDb(), {
    employeeId: payload.employeeId,
    employerId: payload.employerId,
    modifiedBy: getAuditUserId(),
  });
  const after = await listUnlockPreview(await getHrmsDb(), {
    employeeId: payload.employeeId,
    employerId: payload.employerId,
  });
  return {
    after,
    note: "Password reset to welcome123#. Sign in on the HRMS Web login page with that password.",
  };
}
