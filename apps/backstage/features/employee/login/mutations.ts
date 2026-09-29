"use server";

import { z } from "zod";
import { listUnlockPreview, unlockUserAccount } from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";
import { requireResolvedEmployee } from "@/shared/employee";

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
