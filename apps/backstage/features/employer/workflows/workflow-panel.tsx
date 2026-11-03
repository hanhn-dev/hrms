"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, InputNumber, Switch, Tag } from "antd";
import {
  commitCreateWorkflowHeader,
  commitUpdateWorkflowHeader,
  previewCreateWorkflowHeader,
  previewUpdateWorkflowHeader,
} from "@/features/employer/workflows/mutations";
import {
  type LicensedModule,
  type WorkflowDefinition,
  type WorkflowScopeOption,
} from "@/features/employer/workflows/queries";
import {
  searchWorkflowBusinessUnits,
  searchWorkflowLocations,
} from "@/features/employer/workflows/scope-actions";
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

export function WorkflowHeading({
  employerId,
  workflow,
}: {
  employerId: number;
  workflow: WorkflowDefinition | null;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
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
  );
}

export function WorkflowDetailsPanel({
  employerId,
  workflow,
  pages,
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
  locations: WorkflowScopeOption[];
  businessUnits: WorkflowScopeOption[];
  modules: LicensedModule[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const isCreate = workflow == null;
  const [header, setHeader] = useState<HeaderDraft>(() => initialHeader(workflow, modules));
  const [headerConfirmOpen, setHeaderConfirmOpen] = useState(false);
  const createdIdRef = useRef<number | null>(null);

  const pageOptions = (() => {
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
  })();

  const moduleOptions = (() => {
    const options = new Map<number, { value: number; label: string }>();
    for (const workflowModule of modules) {
      if (!options.has(workflowModule.moduleId)) {
        options.set(workflowModule.moduleId, {
          value: workflowModule.moduleId,
          label: workflowModule.moduleName,
        });
      }
    }
    return [...options.values()];
  })();

  const headerReady =
    header.workflowName.trim().length > 0 &&
    header.moduleId != null &&
    header.mappedPageIds.length > 0;

  function patchHeader(partial: Partial<HeaderDraft>): void {
    setHeader((current) => ({ ...current, ...partial }));
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
    <>
      <Card
        title={isCreate ? "Create workflow" : workflow.workflowName}
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
            <SearchSelect
              mode="multiple"
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
            <WorkflowScopeSelect
              employerId={employerId}
              initial={locations}
              kind="location"
              value={header.locationIds}
              onChange={(locationIds) => {
                patchHeader({
                  locationIds,
                  isLocationMapped: locationIds.length > 0,
                });
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Business units</span>
            <WorkflowScopeSelect
              employerId={employerId}
              initial={businessUnits}
              kind="businessUnit"
              value={header.businessUnitIds}
              onChange={(businessUnitIds) => {
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
    </>
  );
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

function WorkflowScopeSelect({
  employerId,
  kind,
  value,
  initial,
  onChange,
}: {
  employerId: number;
  kind: "location" | "businessUnit";
  value: number[];
  initial: WorkflowScopeOption[];
  onChange: (ids: number[]) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(initial);
  const [seenInitial, setSeenInitial] = useState(initial);
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setLoaded(initial);
  }
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      const request =
        kind === "location"
          ? searchWorkflowLocations(employerId, trimmed, value)
          : searchWorkflowBusinessUnits(employerId, trimmed, value);
      void request.then((rows) => {
        if (!cancelled) {
          setLoaded(rows);
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employerId, kind, query, value]);
  const options = query.trim().length < 2 ? mergeScopeOptions(initial, loaded, value) : loaded;
  return (
    <SearchSelect
      allowClear
      className="w-full"
      filterOption={false}
      mode="multiple"
      options={uniqueOptions(options)}
      value={value}
      onChange={onChange}
      onSearch={setQuery}
    />
  );
}

function mergeScopeOptions(
  initial: WorkflowScopeOption[],
  extra: WorkflowScopeOption[],
  selected: readonly number[],
): WorkflowScopeOption[] {
  const byId = new Map(initial.map((item) => [item.id, item]));
  const selectedIds = new Set(selected);
  for (const item of extra) {
    if (selectedIds.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
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
