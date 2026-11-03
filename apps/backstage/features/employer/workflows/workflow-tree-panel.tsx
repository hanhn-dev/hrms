"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Tag, Typography } from "antd";
import {
  BUILTIN_WORKFLOW_ROLES,
  actorFromName,
  emptyWorkflowTree,
  type WorkflowActor,
  type WorkflowLevel,
  type WorkflowTree,
} from "@hrms/db/workflow-tree";
import {
  commitUpdateWorkflowTree,
  previewUpdateWorkflowTree,
} from "@/features/employer/workflows/mutations";
import {
  type WorkflowDefinition,
  type WorkflowGroupRow,
} from "@/features/employer/workflows/queries";
import {
  alignWorkflowLevels,
  treeForSave,
} from "@/features/employer/workflows/workflow-tree-levels";
import { ConfirmWriteModal, SearchSelect } from "@/shared/ui";

type ActorOption = {
  value: string;
  label: string;
  empty?: boolean;
};

export function WorkflowTreePanel({
  employerId,
  workflow,
  groups,
  writesEnabled,
}: {
  employerId: number;
  workflow: WorkflowDefinition | null;
  groups: WorkflowGroupRow[];
  writesEnabled: boolean;
}): React.JSX.Element {
  if (workflow == null) {
    return (
      <Alert
        showIcon
        type="info"
        title="Create the header first"
        description="The tree is saved after the workflow exists. Create the header, then assign approvers."
      />
    );
  }

  return (
    <WorkflowTreeEditor
      employerId={employerId}
      groups={groups}
      workflow={workflow}
      writesEnabled={writesEnabled}
    />
  );
}

function WorkflowTreeEditor({
  employerId,
  workflow,
  groups,
  writesEnabled,
}: {
  employerId: number;
  workflow: WorkflowDefinition;
  groups: WorkflowGroupRow[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const routingLevels = Math.max(workflow.routingLevels, 1);
  const [tree, setTree] = useState<WorkflowTree>(() =>
    alignWorkflowLevels(
      workflow.tree ?? emptyWorkflowTree(workflow.workflowName, routingLevels),
      routingLevels,
    ),
  );
  const [treeConfirmOpen, setTreeConfirmOpen] = useState(false);
  const savedTree = treeForSave(tree, routingLevels);
  const extraLevels = tree.levels.filter((level) => level.level > routingLevels);

  const actorOptions = (() => {
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
  })();

  const emptyUsedGroups = groups.filter((group) => group.isEmptyReferenced);

  function updateLevel(index: number, patch: Partial<WorkflowLevel>): void {
    setTree((current) => ({
      ...current,
      levels: current.levels.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  return (
    <>
      <Card
        title="Approval tree"
        extra={
          <Button
            disabled={!writesEnabled}
            type="primary"
            onClick={() => {
              setTreeConfirmOpen(true);
            }}
          >
            Preview tree save
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {emptyUsedGroups.length > 0 ? (
            <Alert
              showIcon
              type="warning"
              title="Empty workflow groups are referenced"
              description={emptyUsedGroups.map((group) => group.roleName).join(", ")}
            />
          ) : null}
          {extraLevels.length > 0 ? (
            <Alert
              showIcon
              type="warning"
              title="The header has fewer steps than this path"
              description={`Routing levels is ${routingLevels}, but this path has ${tree.levels.length} steps. Saving the path removes the extra steps.`}
            />
          ) : null}
          {workflow.isNotificationOnly ? (
            <Typography.Text type="secondary">
              Notification-only page: approvers are optional.
            </Typography.Text>
          ) : null}

          <div className="mx-auto flex w-full max-w-3xl flex-col" aria-label="Approval path">
            <StartNode workflow={workflow} />
            {tree.levels.map((level, index) => (
              <div key={level.level}>
                <PathConnector />
                <LevelNode
                  disabled={level.level > routingLevels}
                  level={level}
                  notificationOnly={workflow.isNotificationOnly}
                  options={actorOptions}
                  onApproversChange={(names) => {
                    updateLevel(index, { approvers: names.map(actorFromName) });
                  }}
                  onNotificationsChange={(names) => {
                    updateLevel(index, { notifications: names.map(actorFromName) });
                  }}
                />
              </div>
            ))}
            <PathConnector label="after the last step" />
            <div className="grid gap-3 md:grid-cols-3">
              <OutcomeNode
                accent="green"
                actors={tree.notifyApproval}
                options={actorOptions}
                title="When it is approved"
                onChange={(names) => {
                  setTree((current) => ({
                    ...current,
                    notifyApproval: names.map(actorFromName),
                  }));
                }}
              />
              <OutcomeNode
                accent="red"
                actors={tree.notifyRejection}
                options={actorOptions}
                title="When it is rejected"
                onChange={(names) => {
                  setTree((current) => ({
                    ...current,
                    notifyRejection: names.map(actorFromName),
                  }));
                }}
              />
              <OutcomeNode
                accent="amber"
                actors={tree.notifyPullback}
                options={actorOptions}
                title="When it is pulled back"
                onChange={(names) => {
                  setTree((current) => ({
                    ...current,
                    notifyPullback: names.map(actorFromName),
                  }));
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      <ConfirmWriteModal
        hideTrigger
        buttonLabel="Preview tree"
        open={treeConfirmOpen}
        previewAction={() =>
          previewUpdateWorkflowTree({
            employerId,
            workflowId: workflow.workflowId,
            tree: savedTree,
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
    </>
  );
}

function StartNode({ workflow }: { workflow: WorkflowDefinition }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Request submitted
      </div>
      <div className="mt-1 text-base font-semibold">{workflow.workflowName}</div>
      {workflow.skipWorkFlow || workflow.isEnableAutoApproved ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {workflow.skipWorkFlow ? <Tag>Skip workflow</Tag> : null}
          {workflow.isEnableAutoApproved ? <Tag color="blue">Auto-approve</Tag> : null}
        </div>
      ) : null}
    </div>
  );
}

function PathConnector({ label = "then" }: { label?: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center py-1 text-xs text-slate-500" aria-hidden="true">
      <div className="h-3 w-px bg-slate-300" />
      <span>{label}</span>
      <ArrowDownOutlined />
    </div>
  );
}

function LevelNode({
  level,
  notificationOnly,
  options,
  disabled,
  onApproversChange,
  onNotificationsChange,
}: {
  level: WorkflowLevel;
  notificationOnly: boolean;
  options: ActorOption[];
  disabled: boolean;
  onApproversChange: (names: string[]) => void;
  onNotificationsChange: (names: string[]) => void;
}): React.JSX.Element {
  const unassigned = notificationOnly
    ? level.notifications.length === 0
    : level.approvers.length === 0;
  const approvers = (
    <ActorSelect
      disabled={disabled}
      label={notificationOnly ? "Who must approve (optional)" : "Who must approve"}
      options={options}
      value={level.approvers.map((actor) => actor.name)}
      onChange={onApproversChange}
    />
  );
  const notifications = (
    <ActorSelect
      disabled={disabled}
      label="Who is notified at this step"
      options={options}
      value={level.notifications.map((actor) => actor.name)}
      onChange={onNotificationsChange}
    />
  );
  return (
    <div
      className={`rounded-lg border bg-white px-4 py-3 ${
        unassigned || disabled ? "border-dashed border-amber-400" : "border-slate-300"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Level {level.level}</div>
        {disabled ? <Tag color="orange">Removed when you save</Tag> : null}
      </div>
      <div className="flex flex-col gap-3">
        {notificationOnly ? (
          <>
            {notifications}
            {level.notifications.length === 0 ? <UnassignedNote /> : null}
            {approvers}
          </>
        ) : (
          <>
            {approvers}
            {level.approvers.length === 0 ? <UnassignedNote /> : null}
            {notifications}
          </>
        )}
      </div>
    </div>
  );
}

function UnassignedNote(): React.JSX.Element {
  return <Typography.Text type="secondary">Nobody assigned yet</Typography.Text>;
}

function OutcomeNode({
  title,
  accent,
  actors,
  options,
  onChange,
}: {
  title: string;
  accent: "green" | "red" | "amber";
  actors: WorkflowActor[];
  options: ActorOption[];
  onChange: (names: string[]) => void;
}): React.JSX.Element {
  const border =
    accent === "green" ? "border-green-500" : accent === "red" ? "border-red-400" : "border-amber-400";
  return (
    <div className={`rounded-lg border border-t-4 bg-white px-4 py-3 ${border}`}>
      <div className="mb-3 font-semibold">{title}</div>
      <ActorSelect
        label="Who is told"
        options={options}
        value={actors.map((actor) => actor.name)}
        onChange={onChange}
      />
    </div>
  );
}

function ActorSelect({
  label,
  options,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  options: ActorOption[];
  value: string[];
  disabled?: boolean;
  onChange: (value: string[]) => void;
}): React.JSX.Element {
  const emptySelected = options.filter((option) => option.empty && value.includes(option.value));
  return (
    <label className="flex flex-col gap-1">
      <span>{label}</span>
      <SearchSelect
        disabled={disabled}
        mode="multiple"
        options={options}
        tagRender={(tag) => (
          <Tag
            className="!me-1"
            closable={tag.closable}
            onClose={tag.onClose}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {String(tag.value)}
          </Tag>
        )}
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
