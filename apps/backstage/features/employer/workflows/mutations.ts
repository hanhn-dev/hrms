"use server";

import { z } from "zod";
import {
  createWorkflowHeader,
  decideChangeRequest,
  getChangeRequestWritePreview,
  getWorkflowWritePreview,
  listWorkflowCollisions,
  updateWorkflowHeader,
  updateWorkflowTree,
  type WorkflowHeaderInput,
  type WorkflowTree,
} from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";

const CONFIG_NOTE =
  "Updates workflow configuration only. In-flight TRequestWorkflows rows are not rewritten.";

const actorSchema = z.object({
  name: z.string().trim().min(1),
  roleCode: z.string().trim().min(1).max(2),
});

const treeSchema = z.object({
  rootText: z.string().trim().min(1).max(100),
  levels: z
    .array(
      z.object({
        level: z.number().int().positive(),
        approvers: z.array(actorSchema),
        notifications: z.array(actorSchema),
      }),
    )
    .max(20),
  notifyApproval: z.array(actorSchema),
  notifyRejection: z.array(actorSchema),
  notifyPullback: z.array(actorSchema),
});

const headerFieldsSchema = z.object({
  employerId: z.number().int().positive(),
  workflowName: z.string().trim().min(1).max(100),
  workflowDescription: z.string().trim().max(200).nullable(),
  routingLevels: z.number().int().min(1).max(20),
  mappedPageIds: z.array(z.number().int().positive()).min(1),
  moduleId: z.number().int().positive(),
  isDefault: z.boolean(),
  isEnable: z.boolean(),
  skipWorkFlow: z.boolean(),
  isEnableAutoApproved: z.boolean(),
  isLocationMapped: z.boolean(),
  isBuMapped: z.boolean(),
  isAllBuSelected: z.boolean(),
  isAllLocationSelected: z.boolean(),
  locationIds: z.array(z.number().int().positive()),
  businessUnitIds: z.array(z.number().int().positive()),
});

const createHeaderPayloadSchema = headerFieldsSchema.extend({
  action: z.literal("create-workflow-header"),
  env: z.string().min(1),
});

const updateHeaderPayloadSchema = headerFieldsSchema.extend({
  action: z.literal("update-workflow-header"),
  env: z.string().min(1),
  workflowId: z.number().int().positive(),
});

const updateTreePayloadSchema = z.object({
  action: z.literal("update-workflow-tree"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  workflowId: z.number().int().positive(),
  tree: treeSchema,
});

function toHeaderInput(
  payload: z.infer<typeof headerFieldsSchema> & { workflowId?: number },
): WorkflowHeaderInput {
  return {
    employerId: payload.employerId,
    workflowId: payload.workflowId,
    workflowName: payload.workflowName,
    workflowDescription: payload.workflowDescription,
    routingLevels: payload.routingLevels,
    mappedPageIds: payload.mappedPageIds,
    moduleId: payload.moduleId,
    isDefault: payload.isDefault,
    isEnable: payload.isEnable,
    skipWorkFlow: payload.skipWorkFlow,
    isEnableAutoApproved: payload.isEnableAutoApproved,
    isLocationMapped: payload.isLocationMapped,
    isBuMapped: payload.isBuMapped,
    isAllBuSelected: payload.isAllBuSelected,
    isAllLocationSelected: payload.isAllLocationSelected,
    locationIds: payload.locationIds,
    businessUnitIds: payload.businessUnitIds,
  };
}

export async function previewCreateWorkflowHeader(
  input: z.infer<typeof headerFieldsSchema>,
): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = headerFieldsSchema.parse(input);
  const collisions = await listWorkflowCollisions(await getHrmsDb(), toHeaderInput(parsed));
  if (collisions.length > 0) {
    throw new Error(
      `Another enabled workflow already maps the same page(s) without BU/location scope: ${collisions
        .map((row) => row.workflowName)
        .join(", ")}.`,
    );
  }
  return {
    token: createConfirmToken({
      action: "create-workflow-header",
      env,
      ...parsed,
    }),
    preview: [
      {
        WorkflowName: parsed.workflowName,
        ModuleId: parsed.moduleId,
        MappedPageIds: parsed.mappedPageIds.join(","),
        RoutingLevels: parsed.routingLevels,
        IsDefault: parsed.isDefault,
        IsEnable: parsed.isEnable,
      },
    ],
    note: CONFIG_NOTE,
  };
}

export async function commitCreateWorkflowHeader(token: string): Promise<{
  after: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, createHeaderPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const workflowId = await createWorkflowHeader(await getHrmsDb(), {
    ...toHeaderInput(payload),
    createdBy: getAuditUserId(),
  });
  return {
    after: await getWorkflowWritePreview(await getHrmsDb(), payload.employerId, workflowId),
    note: `Created workflow ${workflowId}.`,
  };
}

export async function previewUpdateWorkflowHeader(
  input: z.infer<typeof headerFieldsSchema> & { workflowId: number },
): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = headerFieldsSchema.extend({
    workflowId: z.number().int().positive(),
  }).parse(input);
  const collisions = await listWorkflowCollisions(await getHrmsDb(), toHeaderInput(parsed));
  if (collisions.length > 0) {
    throw new Error(
      `Another enabled workflow already maps the same page(s) without BU/location scope: ${collisions
        .map((row) => row.workflowName)
        .join(", ")}.`,
    );
  }
  const preview = await getWorkflowWritePreview(
    await getHrmsDb(),
    parsed.employerId,
    parsed.workflowId,
  );
  if (preview.length === 0) {
    throw new Error("Workflow was not found for this employer.");
  }
  return {
    token: createConfirmToken({
      action: "update-workflow-header",
      env,
      ...parsed,
    }),
    preview: preview.map((row) => ({
      ...row,
      ProposedName: parsed.workflowName,
      ProposedPages: parsed.mappedPageIds.join(","),
      ProposedLevels: parsed.routingLevels,
    })),
    note: CONFIG_NOTE,
  };
}

export async function commitUpdateWorkflowHeader(token: string): Promise<{
  after: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, updateHeaderPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  await updateWorkflowHeader(await getHrmsDb(), {
    ...toHeaderInput(payload),
    workflowId: payload.workflowId,
    updatedBy: getAuditUserId(),
  });
  return {
    after: await getWorkflowWritePreview(
      await getHrmsDb(),
      payload.employerId,
      payload.workflowId,
    ),
    note: "Workflow header updated.",
  };
}

export async function previewUpdateWorkflowTree(input: {
  employerId: number;
  workflowId: number;
  tree: WorkflowTree;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const tree = treeSchema.parse(input.tree) as WorkflowTree;
  const preview = await getWorkflowWritePreview(
    await getHrmsDb(),
    input.employerId,
    input.workflowId,
  );
  if (preview.length === 0) {
    throw new Error("Workflow was not found for this employer.");
  }
  return {
    token: createConfirmToken({
      action: "update-workflow-tree",
      env,
      employerId: input.employerId,
      workflowId: input.workflowId,
      tree,
    }),
    preview: preview.map((row) => ({
      ...row,
      ProposedLevels: tree.levels.length,
      ProposedApprovers: tree.levels
        .flatMap((level) => level.approvers.map((actor) => actor.name))
        .join(", "),
    })),
    note: CONFIG_NOTE,
  };
}

export async function commitUpdateWorkflowTree(token: string): Promise<{
  after: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, updateTreePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  await updateWorkflowTree(await getHrmsDb(), {
    employerId: payload.employerId,
    workflowId: payload.workflowId,
    tree: payload.tree as WorkflowTree,
    updatedBy: getAuditUserId(),
  });
  return {
    after: await getWorkflowWritePreview(
      await getHrmsDb(),
      payload.employerId,
      payload.workflowId,
    ),
    note: "Workflow tree updated.",
  };
}

const decideChangeRequestSchema = z.object({
  employerId: z.number().int().positive(),
  workflowId: z.number().int().positive(),
  changeRequestId: z.number().int().positive(),
  approverEmployeeId: z.number().int().positive(),
  status: z.enum(["Approved", "Rejected"]),
  comments: z.string().trim().min(1).max(2000),
});

const decideChangeRequestPayloadSchema = decideChangeRequestSchema.extend({
  action: z.literal("approve-change-request"),
  env: z.string().min(1),
});

const APPLY_NOTE = "Preview the rows that will be written, then commit.";

export async function previewDecideChangeRequest(
  input: z.infer<typeof decideChangeRequestSchema>,
): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = decideChangeRequestSchema.parse(input);
  const { preview, notes } = await getChangeRequestWritePreview(await getHrmsDb(), parsed);
  return {
    token: createConfirmToken({
      action: "approve-change-request",
      env,
      ...parsed,
    }),
    preview,
    note: [APPLY_NOTE, ...notes].join(" "),
  };
}

export async function commitDecideChangeRequest(token: string): Promise<{
  after: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, decideChangeRequestPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const after = await decideChangeRequest(await getHrmsDb(), {
    employerId: payload.employerId,
    workflowId: payload.workflowId,
    changeRequestId: payload.changeRequestId,
    approverEmployeeId: payload.approverEmployeeId,
    status: payload.status,
    comments: payload.comments,
  });
  return {
    after,
    note: `${payload.status} change request ${payload.changeRequestId}.`,
  };
}
