"use client";

import { Button, Input, Table, Tabs, Tag } from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChangeRequestPanel } from "@/features/employer/workflows/change-request-panel";
import type {
  ChangeRequestListItem,
  WorkflowGroupRow,
  WorkflowListItem,
  WorkflowPageCatalogRow,
} from "@/features/employer/workflows/queries";
import {
  workflowHref,
  workflowsHref,
  type WorkflowsTab,
} from "@/features/employer/workflows/workflows-source";
import { HighlightMatch } from "@/shared/ui";

const STATUS_COLOR: Record<WorkflowListItem["status"], string> = {
  completed: "green",
  partial: "orange",
  "not-defined": "default",
};

export function WorkflowsPanel({
  employerId,
  tab,
  workflows,
  pages,
  groups,
  changeRequests,
  writesEnabled,
}: {
  employerId: number;
  tab: WorkflowsTab;
  workflows: WorkflowListItem[];
  pages: WorkflowPageCatalogRow[];
  groups: WorkflowGroupRow[];
  changeRequests: ChangeRequestListItem[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const visibleWorkflows = useMemo(
    () =>
      workflows.filter((row) =>
        matchesQuery(query, [
          row.workflowName,
          row.moduleName,
          row.mappedPageNames,
        ]),
      ),
    [query, workflows],
  );
  const visiblePages = useMemo(
    () =>
      pages.filter((row) =>
        matchesQuery(query, [
          row.modulePageName,
          row.mappedAppPage,
          row.moduleName,
          row.mappings.map((mapping) => mapping.workflowName).join(" "),
        ]),
      ),
    [pages, query],
  );
  const visibleGroups = useMemo(
    () =>
      groups.filter((row) =>
        matchesQuery(query, [
          row.roleName,
          row.roleDescription,
          ...row.members.flatMap((member) => [member.name, member.employmentNumber]),
        ]),
      ),
    [groups, query],
  );

  return (
    <>
      {tab === "requests" ? null : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Input.Search
            allowClear
            className="max-w-sm"
            placeholder="Search name, module, or page"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
          <Button
            disabled={!writesEnabled}
            type="primary"
            onClick={() => {
              router.push(workflowHref(employerId, "new"));
            }}
          >
            New workflow
          </Button>
        </div>
      )}
      <Tabs
        activeKey={tab}
        destroyOnHidden
        onChange={(next) => {
          router.push(workflowsHref(employerId, next as WorkflowsTab));
        }}
        items={[
          {
            key: "workflows",
            label: `Workflows (${workflows.length})`,
            children: (
              <Table
                rowKey="workflowId"
                dataSource={visibleWorkflows}
                size="small"
                scroll={{ x: "max-content" }}
                columns={[
                  {
                    title: "Workflow",
                    dataIndex: "workflowName",
                    render: (name: string, row: WorkflowListItem) => (
                      <Link href={workflowHref(employerId, row.workflowId)}>
                        <HighlightMatch query={search} text={name} />
                      </Link>
                    ),
                  },
                  { title: "Id", dataIndex: "workflowId", width: 80 },
                  { title: "Module", dataIndex: "moduleName" },
                  { title: "Pages", dataIndex: "mappedPageNames" },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (status: WorkflowListItem["status"]) => (
                      <Tag color={STATUS_COLOR[status]}>{status}</Tag>
                    ),
                  },
                  {
                    title: "Default",
                    dataIndex: "isDefault",
                    render: (value: boolean) => (value ? "Yes" : ""),
                  },
                  {
                    title: "Enabled",
                    dataIndex: "isEnable",
                    render: (value: boolean) => (value ? "Yes" : "No"),
                  },
                  {
                    title: "Skip",
                    dataIndex: "skipWorkFlow",
                    render: (value: boolean) => (value ? "Yes" : ""),
                  },
                  { title: "Levels", dataIndex: "routingLevels", width: 80 },
                  { title: "Locations", dataIndex: "locationNames" },
                  { title: "Business units", dataIndex: "businessUnitNames" },
                ]}
              />
            ),
          },
          {
            key: "pages",
            label: `Pages (${pages.length})`,
            children: (
              <Table
                rowKey={(row) => String(row.modulePageId)}
                dataSource={visiblePages}
                size="small"
                scroll={{ x: "max-content" }}
                columns={[
                  { title: "Page", dataIndex: "modulePageName" },
                  { title: "App page", dataIndex: "mappedAppPage" },
                  { title: "Module", dataIndex: "moduleName" },
                  {
                    title: "Notify only",
                    dataIndex: "isNotificationOnly",
                    render: (value: boolean) => (value ? "Yes" : ""),
                  },
                  {
                    title: "Mapped workflows",
                    render: (_: unknown, row: WorkflowPageCatalogRow) =>
                      row.mappings.length === 0 ? (
                        <Tag>none</Tag>
                      ) : (
                        row.mappings.map((mapping) => (
                          <Link
                            key={`${row.modulePageId}-${mapping.workflowId}`}
                            className="mr-2"
                            href={workflowHref(employerId, mapping.workflowId)}
                          >
                            {mapping.workflowName}{" "}
                            <Tag color={STATUS_COLOR[mapping.status]}>{mapping.status}</Tag>
                          </Link>
                        ))
                      ),
                  },
                  {
                    title: "Template",
                    dataIndex: "hasTemplate",
                    render: (value: boolean) =>
                      value ? <Tag color="blue">Employer 0</Tag> : "",
                  },
                ]}
              />
            ),
          },
          {
            key: "groups",
            label: `Groups (${groups.length})`,
            children: (
              <Table
                rowKey="roleId"
                dataSource={visibleGroups}
                size="small"
                scroll={{ x: "max-content" }}
                columns={[
                  { title: "Group", dataIndex: "roleName" },
                  { title: "Id", dataIndex: "roleId", width: 80 },
                  { title: "Description", dataIndex: "roleDescription" },
                  {
                    title: "Default",
                    dataIndex: "isDefault",
                    render: (value: boolean) => (value ? "Yes" : ""),
                  },
                  {
                    title: "Members",
                    render: (_: unknown, row: WorkflowGroupRow) =>
                      row.members.length === 0
                        ? "—"
                        : row.members.map(formatGroupMemberLabel).join(", "),
                  },
                  { title: "Locations", dataIndex: "locationCount", width: 100 },
                  { title: "Business units", dataIndex: "businessUnitCount", width: 130 },
                  {
                    title: "Used by",
                    dataIndex: "referencedByWorkflowCount",
                    width: 90,
                  },
                  {
                    title: "Warning",
                    render: (_: unknown, row: WorkflowGroupRow) =>
                      row.isEmptyReferenced ? (
                        <Tag color="red">Empty group used by a workflow</Tag>
                      ) : row.memberCount === 0 ? (
                        <Tag color="orange">No members</Tag>
                      ) : null,
                  },
                ]}
              />
            ),
          },
          {
            key: "requests",
            label: `Requests (${changeRequests.length})`,
            children: (
              <ChangeRequestPanel
                employerId={employerId}
                requests={changeRequests}
                writesEnabled={writesEnabled}
              />
            ),
          },
        ]}
      />
    </>
  );
}

function matchesQuery(query: string, values: Array<string | null | undefined>): boolean {
  if (!query) {
    return true;
  }
  return values.some((value) => value?.toLowerCase().includes(query));
}

function formatGroupMemberLabel(member: {
  name: string;
  employmentNumber: string | null;
}): string {
  const employmentNumber = member.employmentNumber?.trim();
  return employmentNumber ? `${member.name} (${employmentNumber})` : member.name;
}
