"use server";

import { z } from "zod";
import {
  getRoleLocationBuScope,
  normalizeCommaIdList,
  setRoleLocationBu,
} from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";

const setRoleLocationBuPayloadSchema = z.object({
  action: z.literal("set-role-location-bu"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  locationIds: z.string().nullable(),
  businessUnitIds: z.string().nullable(),
});

function scopePreviewRows(
  scope: Awaited<ReturnType<typeof getRoleLocationBuScope>>,
  label: string,
): Array<Record<string, unknown>> {
  if (!scope) {
    return [
      {
        Dataset: label,
        Note: "No TRolePagesMapping rows for this role at this employer.",
      },
    ];
  }
  return [
    {
      Dataset: label,
      RoleId: scope.roleId,
      LocationIds: scope.locationIds ?? "(null — unrestricted)",
      BusinessUnitIds: scope.businessUnitIds ?? "(null — unrestricted)",
      PageRows: scope.pageRowCount,
      MatchingEmployees: scope.matchingEmployeeCount,
      RowsDisagree: scope.rowsDisagree ? "Y" : "N",
    },
  ];
}

export async function previewSetRoleLocationBu(input: {
  employerId: number;
  roleId: number;
  locationIds: string;
  businessUnitIds: string;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);

  const locationIds = normalizeCommaIdList(input.locationIds);
  const businessUnitIds = normalizeCommaIdList(input.businessUnitIds);

  const db = await getHrmsDb();
  const current = await getRoleLocationBuScope(db, input.employerId, input.roleId);

  return {
    token: createConfirmToken({
      action: "set-role-location-bu",
      env,
      employerId: input.employerId,
      roleId: input.roleId,
      locationIds,
      businessUnitIds,
    }),
    preview: [
      ...scopePreviewRows(current, "Current"),
      {
        Dataset: "Proposed",
        RoleId: input.roleId,
        LocationIds: locationIds ?? "(null — unrestricted)",
        BusinessUnitIds: businessUnitIds ?? "(null — unrestricted)",
        PageRows: current?.pageRowCount ?? 0,
        Note: "Stamps every TRolePagesMapping row for this role + employer.",
      },
    ],
    note:
      "Updates LocationIds / BusinessUnitIds on all role page-mapping rows. Empty = unrestricted (FN_LocationBU_*). Not workflow tRoleLocationMapping. Users must re-login.",
  };
}

export async function commitSetRoleLocationBu(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, setRoleLocationBuPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);

  const after = await setRoleLocationBu(await getHrmsDb(), {
    employerId: payload.employerId,
    roleId: payload.roleId,
    locationIds: payload.locationIds,
    businessUnitIds: payload.businessUnitIds,
    updatedBy: getAuditUserId(),
  });

  return {
    after: scopePreviewRows(after, "After"),
    note: "Role Location/BU scope updated. Affected users must log out and back in.",
  };
}
