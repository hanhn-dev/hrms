"use server";

import { z } from "zod";
import {
  assignUserRole,
  grantRevokeUserAccess,
  listUserPageRows,
  listUserRolePreview,
  menuIdsForGrant,
} from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";
import { requireResolvedEmployee } from "@/shared/employee";
import { getEmployeeAccess } from "@/features/employee/access/queries";

const assignRolePayloadSchema = z.object({
  action: z.literal("assign-role"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  employmentNumber: z.string().min(1),
  userId: z.number().int().positive(),
  roleId: z.number().int().positive(),
});

const grantRevokePayloadSchema = z.object({
  action: z.literal("grant-revoke-user-pages"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  employmentNumber: z.string().min(1),
  userId: z.number().int().positive(),
  roleId: z.number().int().nullable(),
  mode: z.enum(["GRANT", "REVOKE"]),
  menuIds: z.array(z.number().int().positive()),
  tabRights: z.array(
    z.object({
      menuId: z.number().int().positive(),
      tabId: z.number().int().nonnegative(),
      isEditable: z.enum(["Y", "N"]),
    }),
  ),
});

export async function previewAssignRole(input: {
  employerId: number;
  employmentNumber: string;
  roleId: number;
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
  if (!identity.userId) {
    throw new Error("No TUsers row for this employee.");
  }
  const preview = await listUserRolePreview(await getHrmsDb(), {
    userId: identity.userId,
    employerId: input.employerId,
  });
  return {
    token: createConfirmToken({
      action: "assign-role",
      env,
      employerId: input.employerId,
      employmentNumber: input.employmentNumber,
      userId: identity.userId,
      roleId: input.roleId,
    }),
    preview,
    note: "Sets TUsers.RoleID only. Does not copy role page mappings. User must log out and back in.",
  };
}

export async function commitAssignRole(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, assignRolePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  await assignUserRole(await getHrmsDb(), {
    userId: payload.userId,
    employerId: payload.employerId,
    roleId: payload.roleId,
    updatedBy: getAuditUserId(),
  });
  return {
    after: await listUserRolePreview(await getHrmsDb(), {
      userId: payload.userId,
      employerId: payload.employerId,
    }),
    note: "Role assignment does not copy page mappings. User must re-login.",
  };
}

export async function previewGrantRevokeUserPages(input: {
  employerId: number;
  employmentNumber: string;
  mode: "GRANT" | "REVOKE";
  menuIds: number[];
  tabRights: Array<{ menuId: number; tabId: number; isEditable: "Y" | "N" }>;
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
  if (!identity.userId) {
    throw new Error("No TUsers row for this employee.");
  }
  if (input.menuIds.length === 0 && input.tabRights.length === 0) {
    throw new Error("Select at least one menu or tab.");
  }
  const access = await getEmployeeAccess(input.employerId, input.employmentNumber);
  const menuIds =
    input.mode === "GRANT"
      ? menuIdsForGrant(input.menuIds, access.menus)
      : input.menuIds;
  const preview = await listUserPageRows(await getHrmsDb(), {
    userId: identity.userId,
    employerId: input.employerId,
    menuIds,
  });
  return {
    token: createConfirmToken({
      action: "grant-revoke-user-pages",
      env,
      employerId: input.employerId,
      employmentNumber: input.employmentNumber,
      userId: identity.userId,
      roleId: identity.roleId,
      mode: input.mode,
      menuIds,
      tabRights: input.tabRights,
    }),
    preview:
      preview.length > 0
        ? preview
        : [
            {
              MenuId: menuIds.join(", ") || "(none)",
              Tabs: input.tabRights
                .map((tab) => `${tab.menuId}~${tab.tabId}`)
                .join(", "),
              Note: "No existing user page rows",
            },
          ],
    note:
      input.mode === "GRANT"
        ? "Additive TUSerPagesMapping / TUserTabDetails inserts. Does not call SP_AdminRoleM_InsUserPageMap."
        : "Deletes matching TUSerPagesMapping and selected TUserTabDetails rows. Revoking a menu also removes that menu's user tabs.",
  };
}

export async function commitGrantRevokeUserPages(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, grantRevokePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  await grantRevokeUserAccess(await getHrmsDb(), {
    userId: payload.userId,
    employerId: payload.employerId,
    roleId: payload.roleId,
    createdBy: getAuditUserId(),
    mode: payload.mode,
    menuIds: payload.menuIds,
    tabs: payload.tabRights,
  });
  return {
    after: await listUserPageRows(await getHrmsDb(), {
      userId: payload.userId,
      employerId: payload.employerId,
      menuIds: payload.menuIds,
    }),
    note: "User must log out and back in (Session[HRMS_MENU]).",
  };
}
