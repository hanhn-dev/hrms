"use server";

import { z } from "zod";
import {
  copyTemplateToEmployers,
  getEmployerMenu,
  previewTemplateCopy,
  rebuildMenuXml,
  restoreMenuSnapshot,
  saveEmployerMenu,
} from "@hrms/db";
import { flattenMenuTree, type FlatMenuEdit } from "@hrms/db/menu-tree";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireFeature,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";

const menuNodeSchema = z.object({
  menuId: z.number().int().positive(),
  menuName: z.string().trim().min(1).max(200),
  isActive: z.boolean(),
  parentMenuId: z.number().int().positive().nullable(),
});

const savePayloadSchema = z.object({
  action: z.literal("save-employer-menu"),
  env: z.string().min(1),
  employerId: z.number().int().nonnegative(),
  nodes: z.array(menuNodeSchema).min(1).max(2000),
});

const rebuildPayloadSchema = z.object({
  action: z.literal("rebuild-menu-xml"),
  env: z.string().min(1),
  employerId: z.number().int().nonnegative(),
});

const restorePayloadSchema = z.object({
  action: z.literal("restore-menu-snapshot"),
  env: z.string().min(1),
  employerId: z.number().int().nonnegative(),
  snapshotKey: z.string().min(1).max(200),
});

const copyPayloadSchema = z.object({
  action: z.literal("copy-template-menu"),
  env: z.string().min(1),
  employerIds: z.array(z.number().int().positive()).min(1).max(25),
});

function changeRows(
  current: FlatMenuEdit[],
  proposed: FlatMenuEdit[],
): Array<Record<string, unknown>> {
  const currentById = new Map(current.map((row) => [row.menuId, row]));
  const proposedById = new Map(proposed.map((row) => [row.menuId, row]));
  const rows: Array<Record<string, unknown>> = [];
  for (const row of proposed) {
    const before = currentById.get(row.menuId);
    if (!before) {
      rows.push({ Change: "Add", Item: row.menuId, Name: row.menuName });
      continue;
    }
    if (before.menuName !== row.menuName) {
      rows.push({
        Change: "Rename",
        Item: row.menuId,
        From: before.menuName,
        To: row.menuName,
      });
    }
    if (before.parentMenuId !== row.parentMenuId) {
      rows.push({
        Change: "Move",
        Item: row.menuId,
        Name: row.menuName,
        "Was under": before.parentMenuId ?? "top",
        "Now under": row.parentMenuId ?? "top",
      });
    }
    if (before.isActive !== row.isActive) {
      rows.push({
        Change: row.isActive ? "Show" : "Hide",
        Item: row.menuId,
        Name: row.menuName,
      });
    }
  }
  for (const row of current) {
    if (!proposedById.has(row.menuId)) {
      rows.push({ Change: "Remove", Item: row.menuId, Name: row.menuName });
    }
  }
  return rows;
}

export async function previewSaveEmployerMenu(input: {
  employerId: number;
  nodes: FlatMenuEdit[];
}): Promise<{ token: string; preview: Array<Record<string, unknown>>; note?: string }> {
  await requireFeature("employers");
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const nodes = z.array(menuNodeSchema).min(1).max(2000).parse(input.nodes);
  const menu = await getEmployerMenu(await getHrmsDb(), input.employerId);
  const preview = changeRows(flattenMenuTree(menu.nodes), nodes);
  if (preview.length === 0) {
    throw new Error("No changes to save.");
  }
  const note = menu.inherited
    ? "This organization is inheriting another menu. Saving stores its own copy, and Access Right Management will stop falling back."
    : "This changes only this organization. It does not change who can open each item. People need to sign out and back in.";
  return {
    token: createConfirmToken({
      action: "save-employer-menu",
      env,
      employerId: input.employerId,
      nodes,
    }),
    preview: preview.slice(0, 40),
    note: preview.length > 40 ? `${note} Showing 40 of ${preview.length} changes.` : note,
  };
}

export async function commitSaveEmployerMenu(token: string) {
  await requireFeature("employers");
  const payload = verifyConfirmToken(token, savePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const result = await saveEmployerMenu(await getHrmsDb(), {
    employerId: payload.employerId,
    nodes: payload.nodes,
    updatedBy: getAuditUserId(),
  });
  return {
    after: [{ Items: result.menuCount, "Own menu": result.materialized ? "Yes" : "No" }],
    note: "Menu saved. People need to sign out and back in.",
  };
}

export async function previewRebuildMenuXml(employerId: number) {
  await requireFeature("employers");
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  return {
    token: createConfirmToken({ action: "rebuild-menu-xml", env, employerId }),
    preview: [
      {
        Action: "Show this menu in Access Right Management",
        Organization: employerId,
        Note: "Puts the menu on this page into Access Right Management.",
      },
    ],
    note: "This does not rename items, move them, or change who can open them.",
  };
}

export async function commitRebuildMenuXml(token: string) {
  await requireFeature("employers");
  const payload = verifyConfirmToken(token, rebuildPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const result = await rebuildMenuXml(await getHrmsDb(), {
    employerId: payload.employerId,
    updatedBy: getAuditUserId(),
  });
  return {
    after: [{ Items: result.menuCount }],
    note: "Access Right Management will show this menu. Open that screen again to confirm.",
  };
}

export async function previewRestoreMenuSnapshot(input: {
  employerId: number;
  snapshotKey: string;
}) {
  await requireFeature("employers");
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  return {
    token: createConfirmToken({
      action: "restore-menu-snapshot",
      env,
      employerId: input.employerId,
      snapshotKey: input.snapshotKey,
    }),
    preview: [
      {
        Action: "Put an older copy back",
        Organization: input.employerId,
        Note: "Replaces this organization's menu with that older copy.",
      },
    ],
    note: "The order comes from that older copy. Who can open each item stays as it is.",
  };
}

export async function commitRestoreMenuSnapshot(token: string) {
  await requireFeature("employers");
  const payload = verifyConfirmToken(token, restorePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const result = await restoreMenuSnapshot(await getHrmsDb(), {
    employerId: payload.employerId,
    snapshotKey: payload.snapshotKey,
    updatedBy: getAuditUserId(),
  });
  return {
    after: [{ Items: result.menuCount, Names: result.detailCount }],
    note:
      result.detailCount === 0
        ? "The older menu is back. That copy did not include names, so the current names were left as they are."
        : "The older menu is back. People need to sign out and back in.",
  };
}

export async function previewCopyTemplate(employerIds: number[]) {
  await requireFeature("employers");
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const previews = await previewTemplateCopy(await getHrmsDb(), employerIds);
  const applicable = previews.filter((row) => row.skippedReason == null);
  if (applicable.length === 0) {
    throw new Error(previews[0]?.skippedReason ?? "Nothing to copy.");
  }
  return {
    token: createConfirmToken({
      action: "copy-template-menu",
      env,
      employerIds: applicable.map((row) => row.employerId),
    }),
    preview: previews.map((row) => ({
      Organization: row.employerId,
      Name: row.employerName ?? "—",
      "Items kept": row.keptCount,
      "Items left out": row.droppedCount,
      "Left out": row.dropped
        .map((item) => `${item.menuName} (${item.menuId})`)
        .join(", "),
      Skipped: row.skippedReason ?? "",
    })),
    note: "Each organization you picked gets this menu. Saving the standard menu does not do this by itself. People need to sign out and back in.",
  };
}

export async function commitCopyTemplate(token: string) {
  await requireFeature("employers");
  const payload = verifyConfirmToken(token, copyPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const result = await copyTemplateToEmployers(await getHrmsDb(), {
    employerIds: payload.employerIds,
    updatedBy: getAuditUserId(),
  });
  return {
    after: [
      { Updated: result.updated.join(", ") || "—" },
      {
        Skipped: result.skipped.map((row) => `${row.employerId}: ${row.reason}`).join("; ") || "—",
      },
      {
        Failed: result.failed.map((row) => `${row.employerId}: ${row.reason}`).join("; ") || "—",
      },
    ],
    note: "Those organizations now have this menu. People need to sign out and back in.",
  };
}
