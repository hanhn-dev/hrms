"use client";

import { Alert, Button, Input, Table, Tabs, Tag } from "antd";
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
import { EntityLink } from "@/shared/entity-link";
import { groupIdMatches, namesMatch } from "@/shared/entity-link/focus";
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
  pageName,
  groupId,
  requestId,
}: {
  employerId: number;
  tab: WorkflowsTab;
  workflows: WorkflowListItem[];
  pages: WorkflowPageCatalogRow[];
  groups: WorkflowGroupRow[];
  changeRequests: ChangeRequestListItem[];
  writesEnabled: boolean;
  pageName: string | null;
  groupId: number | null;
  requestId: number | null;
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
  const pageMatched = pageName
    ? pages.filter((row) => namesMatch(row.modulePageName, pageName))
    : pages;
  const pageMissing = pageName != null && pageMatched.length === 0;
  const pageRows = pageMissing ? pages : pageMatched;
  const visiblePages = useMemo(
    () =>
      pageRows.filter((row) =>
        matchesQuery(query, [
          row.modulePageName,
          row.mappedAppPage,
          row.moduleName,
          row.mappings.map((mapping) => mapping.workflowName).join(" "),
        ]),
      ),
    [pageRows, query],
  );
  const groupMatched = groupId == null ? groups : groups.filter((row) => groupIdMatches(row.roleId, groupId));
  const groupMissing = groupId != null && groupMatched.length === 0;
  const groupRows = groupMissing ? groups : groupMatched;
  const visibleGroups = useMemo(
    () =>
      groupRows.filter((row) =>
        matchesQuery(query, [
          row.roleName,
          row.roleDescription,
          ...row.members.flatMap((member) => [member.name, member.employmentNumber]),
        ]),
      ),
    [groupRows, query],
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
                      <EntityLink
                        employerId={employerId}
                        entity={{ kind: "workflow", workflowId: row.workflowId }}
                      >
                        <HighlightMatch query={search} text={name} />
                      </EntityLink>
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
              <>
                <FocusNote
                  clearLabel="All pages"
                  missing={pageMissing}
                  missingTitle={pageName ? `No page named ${pageName}.` : null}
                  title={pageName && !pageMissing ? `Page: ${pageName}` : null}
                  onClear={() => {
                    router.push(workflowsHref(employerId, "pages"));
                  }}
                />
                <Table
                rowKey={(row) => String(row.modulePageId)}
                dataSource={visiblePages}
                size="small"
                scroll={{ x: "max-content" }}
                columns={[
                  {
                    title: "Page",
                    dataIndex: "modulePageName",
                    render: (name: string) => (
                      <EntityLink
                        employerId={employerId}
                        entity={{ kind: "workflowPage", pageName: name }}
                      >
                        <HighlightMatch query={search} text={name} />
                      </EntityLink>
                    ),
                  },
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
                          <span
                            key={`${row.modulePageId}-${mapping.workflowId}`}
                            className="mr-2"
                          >
                            <EntityLink
                              employerId={employerId}
                              entity={{ kind: "workflow", workflowId: mapping.workflowId }}
                            >
                              {mapping.workflowName}
                            </EntityLink>{" "}
                            <Tag color={STATUS_COLOR[mapping.status]}>{mapping.status}</Tag>
                          </span>
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
              </>
            ),
          },
          {
            key: "groups",
            label: `Groups (${groups.length})`,
            children: (
              <>
                <FocusNote
                  clearLabel="All groups"
                  missing={groupMissing}
                  missingTitle={groupId != null ? `No group with id ${groupId}.` : null}
                  title={groupId != null && !groupMissing ? `Group: ${groupId}` : null}
                  onClear={() => {
                    router.push(workflowsHref(employerId, "groups"));
                  }}
                />
                <Table
                rowKey="roleId"
                dataSource={visibleGroups}
                size="small"
                scroll={{ x: "max-content" }}
                columns={[
                  {
                    title: "Group",
                    dataIndex: "roleName",
                    render: (name: string, row: WorkflowGroupRow) => (
                      <EntityLink
                        employerId={employerId}
                        entity={{ kind: "workflowGroup", roleId: row.roleId }}
                      >
                        <HighlightMatch query={search} text={name} />
                      </EntityLink>
                    ),
                  },
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
                      row.members.length === 0 ? (
                        "—"
                      ) : (
                        <span className="inline-flex flex-wrap gap-x-2">
                          {row.members.map((member) => (
                            <EntityLink
                              key={member.employeeId}
                              employerId={employerId}
                              entity={
                                member.employmentNumber
                                  ? {
                                      kind: "employee",
                                      employmentNumber: member.employmentNumber,
                                    }
                                  : null
                              }
                            >
                              {formatGroupMemberLabel(member)}
                            </EntityLink>
                          ))}
                        </span>
                      ),
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
              </>
            ),
          },
          {
            key: "requests",
            label: `Requests (${changeRequests.length})`,
            children: (
              <ChangeRequestPanel
                employerId={employerId}
                requestId={requestId}
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

function FocusNote({
  title,
  missing,
  missingTitle,
  clearLabel,
  onClear,
}: {
  title: string | null;
  missing: boolean;
  missingTitle: string | null;
  clearLabel: string;
  onClear: () => void;
}): React.JSX.Element | null {
  if (!title && !missing) {
    return null;
  }
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {missing && missingTitle ? (
        <Alert showIcon type="info" title={missingTitle} />
      ) : title ? (
        <Alert showIcon type="info" title={title} />
      ) : null}
      <Button type="link" onClick={onClear}>
        {clearLabel}
      </Button>
    </div>
  );
}
