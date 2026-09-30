"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  BUILTIN_WORKFLOW_ROLES,
  actorFromName,
  emptyWorkflowTree,
  type WorkflowTree,
} from "@hrms/db/workflow-tree";
import {
  commitCreateWorkflowHeader,
  commitUpdateWorkflowHeader,
  commitUpdateWorkflowTree,
  previewCreateWorkflowHeader,
  previewUpdateWorkflowHeader,
  previewUpdateWorkflowTree,
} from "@/features/employer/workflows/mutations";
import type {
  LicensedModule,
  WorkflowDefinition,
  WorkflowGroupRow,
  WorkflowScopeOption,
} from "@/features/employer/workflows/queries";
import { workflowHref, workflowsHref } from "@/features/employer/workflows/workflows-source";
import { ConfirmWriteModal, SearchSelect } from "@/shared/ui";

type HeaderDraft = {
  workflowName: string;
  workflowDescription: string | null;
  routingLevels: number;
  mappedPageIds: number[];
  moduleId: number | null;
  isDefault: boolean;
  isEnable: boolean;
  skipWorkFlow: boolean;
  isEnableAutoApproved: boolean;
  isLocationMapped: boolean;
  isBuMapped: boolean;
  isAllBuSelected: boolean;
  isAllLocationSelected: boolean;
  locationIds: number[];
  businessUnitIds: number[];
};

type ActorOption = {
  value: string;
  label: string;
  empty?: boolean;
};

export function WorkflowPanel({
  employerId,
  workflow,
  pages,
  groups,
  locations,
  businessUnits,
  modules,
  writesEnabled,
}: {
  employerId: number;
  workflow: WorkflowDefinition | null;
  pages: Array<{
    modulePageId: number;
    modulePageName: string;
    moduleId: number;
    moduleName: string;
    isNotificationOnly: boolean;
  }>;
  groups: WorkflowGroupRow[];
  locations: WorkflowScopeOption[];
  businessUnits: WorkflowScopeOption[];
  modules: LicensedModule[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const isCreate = workflow == null;
  const [header, setHeader] = useState<HeaderDraft>(() => initialHeader(workflow, modules));
  const [tree, setTree] = useState<WorkflowTree>(() =>
    workflow?.tree ??
    emptyWorkflowTree(workflow?.workflowName ?? "Workflow", header.routingLevels),
  );
  const [headerConfirmOpen, setHeaderConfirmOpen] = useState(false);
  const [treeConfirmOpen, setTreeConfirmOpen] = useState(false);
  const createdIdRef = useRef<number | null>(null);

  const pageOptions = useMemo(() => {
    const options = new Map<number, { value: number; label: string }>();
    for (const page of pages) {
      if (header.moduleId != null && page.moduleId !== header.moduleId) {
        continue;
      }
      if (!options.has(page.modulePageId)) {
        options.set(page.modulePageId, {
          value: page.modulePageId,
          label: `${page.modulePageName} (${page.moduleName})`,
        });
      }
    }
    return [...options.values()];
  }, [header.moduleId, pages]);

  const actorOptions = useMemo<ActorOption[]>(() => {
    const options = new Map<string, ActorOption>();
    for (const role of BUILTIN_WORKFLOW_ROLES) {
      options.set(role.name, { value: role.name, label: role.name });
    }
    for (const group of groups) {
      const label = formatGroupActorLabel(group);
      const empty = group.members.length === 0;
      if (options.has(group.roleName)) {
        const current = options.get(group.roleName);
        if (current) {
          current.empty = current.empty || empty;
          current.label = label;
        }
        continue;
      }
      options.set(group.roleName, {
        value: group.roleName,
        label,
        empty,
      });
    }
    return [...options.values()];
  }, [groups]);

  const moduleOptions = useMemo(() => {
    const options = new Map<number, { value: number; label: string }>();
    for (const module of modules) {
      if (!options.has(module.moduleId)) {
        options.set(module.moduleId, {
          value: module.moduleId,
          label: module.moduleName,
        });
      }
    }
    return [...options.values()];
  }, [modules]);

  const selectedPages = pages.filter((page) => header.mappedPageIds.includes(page.modulePageId));
  const notificationOnly = selectedPages.some((page) => page.isNotificationOnly);
  const emptyUsedGroups = groups.filter((group) => group.isEmptyReferenced);
  const headerReady =
    header.workflowName.trim().length > 0 &&
    header.moduleId != null &&
    header.mappedPageIds.length > 0;

  function patchHeader(partial: Partial<HeaderDraft>): void {
    setHeader((current) => {
      const next = { ...current, ...partial };
      if (partial.routingLevels != null && partial.routingLevels !== current.routingLevels) {
        setTree((currentTree) => syncTreeLevels(currentTree, partial.routingLevels ?? next.routingLevels));
      }
      if (partial.workflowName != null) {
        setTree((currentTree) => ({
          ...currentTree,
          rootText: partial.workflowName?.trim() || currentTree.rootText,
        }));
      }
      return next;
    });
  }

  const headerInput = {
    employerId,
    workflowName: header.workflowName,
    workflowDescription: header.workflowDescription,
    routingLevels: header.routingLevels,
    mappedPageIds: header.mappedPageIds,
    moduleId: header.moduleId ?? 0,
    isDefault: header.isDefault,
    isEnable: header.isEnable,
    skipWorkFlow: header.skipWorkFlow,
    isEnableAutoApproved: header.isEnableAutoApproved,
    isLocationMapped: header.isLocationMapped,
    isBuMapped: header.isBuMapped,
    isAllBuSelected: header.isAllBuSelected,
    isAllLocationSelected: header.isAllLocationSelected,
    locationIds: header.locationIds,
    businessUnitIds: header.businessUnitIds,
  };

  return (
    <Space className="w-full" orientation="vertical" size="large">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="link"
          className="!px-0"
          onClick={() => {
            router.push(workflowsHref(employerId));
          }}
        >
          Back to workflows
        </Button>
        {workflow ? (
          <Tag color={statusColor(workflow.status)}>{workflow.status}</Tag>
        ) : (
          <Tag>new</Tag>
        )}
      </div>

      {emptyUsedGroups.length > 0 ? (
        <Alert
          showIcon
          type="warning"
          title="Empty workflow groups are referenced"
          description={emptyUsedGroups.map((group) => group.roleName).join(", ")}
        />
      ) : null}

      <Card
        title={isCreate ? "Create workflow" : `Header · ${workflow.workflowName}`}
        extra={
          <Button
            disabled={!writesEnabled || !headerReady}
            type="primary"
            onClick={() => {
              setHeaderConfirmOpen(true);
            }}
          >
            {isCreate ? "Preview create" : "Preview header save"}
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span>Name</span>
            <Input
              maxLength={100}
              value={header.workflowName}
              onChange={(event) => {
                patchHeader({ workflowName: event.target.value });
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Module</span>
            <SearchSelect
              optionFilterProp="label"
              options={moduleOptions}
              value={header.moduleId}
              onChange={(moduleId: number) => {
                patchHeader({
                  moduleId,
                  mappedPageIds: header.mappedPageIds.filter((pageId) =>
                    pages.some((page) => page.modulePageId === pageId && page.moduleId === moduleId),
                  ),
                });
              }}
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span>Description</span>
            <Input
              maxLength={200}
              value={header.workflowDescription ?? ""}
              onChange={(event) => {
                patchHeader({ workflowDescription: event.target.value || null });
              }}
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span>Mapped pages</span>
            <Select
              mode="multiple"
              optionFilterProp="label"
              options={pageOptions}
              value={header.mappedPageIds}
              onChange={(mappedPageIds: number[]) => {
                patchHeader({ mappedPageIds });
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Routing levels</span>
            <InputNumber
              className="w-full"
              max={20}
              min={1}
              value={header.routingLevels}
              onChange={(value) => {
                patchHeader({ routingLevels: typeof value === "number" ? value : 1 });
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <SwitchRow
              checked={header.isDefault}
              label="Default"
              onChange={(isDefault) => {
                patchHeader({ isDefault });
              }}
            />
            <SwitchRow
              checked={header.isEnable}
              label="Enabled"
              onChange={(isEnable) => {
                patchHeader({ isEnable });
              }}
            />
            <SwitchRow
              checked={header.skipWorkFlow}
              label="Skip workflow"
              onChange={(skipWorkFlow) => {
                patchHeader({ skipWorkFlow });
              }}
            />
            <SwitchRow
              checked={header.isEnableAutoApproved}
              label="Auto-approve"
              onChange={(isEnableAutoApproved) => {
                patchHeader({ isEnableAutoApproved });
              }}
            />
          </div>
          <label className="flex flex-col gap-1">
            <span>Locations</span>
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={uniqueOptions(locations)}
              value={header.locationIds}
              onChange={(locationIds: number[]) => {
                patchHeader({
                  locationIds,
                  isLocationMapped: locationIds.length > 0,
                });
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Business units</span>
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={uniqueOptions(businessUnits)}
              value={header.businessUnitIds}
              onChange={(businessUnitIds: number[]) => {
                patchHeader({
                  businessUnitIds,
                  isBuMapped: businessUnitIds.length > 0,
                });
              }}
            />
          </label>
          <SwitchRow
            checked={header.isAllLocationSelected}
            label="All locations"
            onChange={(isAllLocationSelected) => {
              patchHeader({ isAllLocationSelected });
            }}
          />
          <SwitchRow
            checked={header.isAllBuSelected}
            label="All business units"
            onChange={(isAllBuSelected) => {
              patchHeader({ isAllBuSelected });
            }}
          />
        </div>
      </Card>

      <Card
        title="Approval tree"
        extra={
          <Button
            disabled={!writesEnabled || isCreate}
            type="primary"
            onClick={() => {
              setTreeConfirmOpen(true);
            }}
          >
            Preview tree save
          </Button>
        }
      >
        {isCreate ? (
          <Alert
            showIcon
            type="info"
            title="Create the header first"
            description="The tree is saved after the workflow exists. Create the header, then assign approvers."
          />
        ) : (
          <Space className="w-full" orientation="vertical" size="middle">
            {notificationOnly ? (
              <Typography.Text type="secondary">
                Notification-only page: approvers are optional.
              </Typography.Text>
            ) : null}
            {tree.levels.map((level, index) => (
              <Card key={level.level} size="small" title={`Level ${level.level}`}>
                <div className="grid gap-3 md:grid-cols-2">
                  <ActorSelect
                    label="Approvers"
                    options={actorOptions}
                    value={level.approvers.map((actor) => actor.name)}
                    onChange={(names) => {
                      setTree((current) => ({
                        ...current,
                        levels: current.levels.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, approvers: names.map(actorFromName) }
                            : item,
                        ),
                      }));
                    }}
                  />
                  <ActorSelect
                    label="Notifications"
                    options={actorOptions}
                    value={level.notifications.map((actor) => actor.name)}
                    onChange={(names) => {
                      setTree((current) => ({
                        ...current,
                        levels: current.levels.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, notifications: names.map(actorFromName) }
                            : item,
                        ),
                      }));
                    }}
                  />
                </div>
              </Card>
            ))}
            <div className="grid gap-3 md:grid-cols-3">
              <ActorSelect
                label="Notify approval"
                options={actorOptions}
                value={tree.notifyApproval.map((actor) => actor.name)}
                onChange={(names) => {
                  setTree((current) => ({
                    ...current,
                    notifyApproval: names.map(actorFromName),
                  }));
                }}
              />
              <ActorSelect
                label="Notify rejection"
                options={actorOptions}
                value={tree.notifyRejection.map((actor) => actor.name)}
                onChange={(names) => {
                  setTree((current) => ({
                    ...current,
                    notifyRejection: names.map(actorFromName),
                  }));
                }}
              />
              <ActorSelect
                label="Notify pullback"
                options={actorOptions}
                value={tree.notifyPullback.map((actor) => actor.name)}
                onChange={(names) => {
                  setTree((current) => ({
                    ...current,
                    notifyPullback: names.map(actorFromName),
                  }));
                }}
              />
            </div>
          </Space>
        )}
      </Card>

      <ConfirmWriteModal
        hideTrigger
        buttonLabel="Preview header"
        open={headerConfirmOpen}
        previewAction={() =>
          isCreate
            ? previewCreateWorkflowHeader(headerInput)
            : previewUpdateWorkflowHeader({
                ...headerInput,
                workflowId: workflow.workflowId,
              })
        }
        commitAction={async (token) => {
          if (isCreate) {
            const result = await commitCreateWorkflowHeader(token);
            const createdId = result.after[0]?.WorkflowId;
            createdIdRef.current = typeof createdId === "number" ? createdId : null;
            return result;
          }
          return commitUpdateWorkflowHeader(token);
        }}
        successMessage={isCreate ? "Workflow created." : "Workflow header updated."}
        title={isCreate ? "Create workflow" : "Update workflow header"}
        onDone={() => {
          if (isCreate && createdIdRef.current) {
            router.push(workflowHref(employerId, createdIdRef.current));
            return;
          }
          router.refresh();
        }}
        onOpenChange={setHeaderConfirmOpen}
      />
      {workflow ? (
        <ConfirmWriteModal
          hideTrigger
          buttonLabel="Preview tree"
          open={treeConfirmOpen}
          previewAction={() =>
            previewUpdateWorkflowTree({
              employerId,
              workflowId: workflow.workflowId,
              tree,
            })
          }
          commitAction={commitUpdateWorkflowTree}
          successMessage="Workflow tree updated."
          title="Update workflow tree"
          onDone={() => {
            router.refresh();
          }}
          onOpenChange={setTreeConfirmOpen}
        />
      ) : null}
    </Space>
  );
}

function ActorSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ActorOption[];
  value: string[];
  onChange: (value: string[]) => void;
}): React.JSX.Element {
  const emptySelected = options.filter((option) => option.empty && value.includes(option.value));
  return (
    <label className="flex flex-col gap-1">
      <span>{label}</span>
      <Select
        mode="multiple"
        optionFilterProp="label"
        options={options}
        value={value}
        onChange={onChange}
      />
      {emptySelected.length > 0 ? (
        <Typography.Text type="danger">
          Empty group: {emptySelected.map((option) => option.value).join(", ")}
        </Typography.Text>
      ) : null}
    </label>
  );
}

function formatGroupActorLabel(group: WorkflowGroupRow): string {
  if (group.members.length === 0) {
    return `${group.roleName} (no members)`;
  }
  const names = group.members.map(formatGroupMemberLabel).join(", ");
  return `${group.roleName} — ${names}`;
}

function formatGroupMemberLabel(member: {
  name: string;
  employmentNumber: string | null;
}): string {
  const employmentNumber = member.employmentNumber?.trim();
  return employmentNumber ? `${member.name} (${employmentNumber})` : member.name;
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="flex items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2">
      <span>{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

function initialHeader(
  workflow: WorkflowDefinition | null,
  modules: LicensedModule[],
): HeaderDraft {
  return {
    workflowName: workflow?.workflowName ?? "",
    workflowDescription: workflow?.workflowDescription ?? null,
    routingLevels: workflow?.routingLevels ?? 1,
    mappedPageIds: workflow?.mappedPageIds ?? [],
    moduleId: workflow?.moduleId ?? modules[0]?.moduleId ?? null,
    isDefault: workflow?.isDefault ?? false,
    isEnable: workflow?.isEnable ?? true,
    skipWorkFlow: workflow?.skipWorkFlow ?? false,
    isEnableAutoApproved: workflow?.isEnableAutoApproved ?? false,
    isLocationMapped: workflow?.isLocationMapped ?? false,
    isBuMapped: workflow?.isBuMapped ?? false,
    isAllBuSelected: workflow?.isAllBuSelected ?? false,
    isAllLocationSelected: workflow?.isAllLocationSelected ?? false,
    locationIds: workflow?.locationIds ?? [],
    businessUnitIds: workflow?.businessUnitIds ?? [],
  };
}

function syncTreeLevels(tree: WorkflowTree, routingLevels: number): WorkflowTree {
  const levels = Array.from({ length: Math.max(routingLevels, 1) }, (_, index) => {
    return (
      tree.levels.find((level) => level.level === index + 1) ?? {
        level: index + 1,
        approvers: [],
        notifications: [],
      }
    );
  });
  return { ...tree, levels };
}

function uniqueOptions(
  items: Array<{ id: number; name: string }>,
): Array<{ value: number; label: string }> {
  const options = new Map<number, { value: number; label: string }>();
  for (const item of items) {
    if (!options.has(item.id)) {
      options.set(item.id, { value: item.id, label: item.name });
    }
  }
  return [...options.values()];
}

function statusColor(status: WorkflowDefinition["status"]): string {
  if (status === "completed") {
    return "green";
  }
  if (status === "partial") {
    return "orange";
  }
  return "default";
}
