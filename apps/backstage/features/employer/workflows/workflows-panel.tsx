"use client";

import { Alert, Button, Tabs, Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
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

export function WorkflowsTabBar({
  employerId,
  tab,
  writesEnabled,
  children,
}: {
  employerId: number;
  tab: WorkflowsTab;
  writesEnabled: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <>
      {tab === "requests" ? null : (
        <div className="mb-4 flex justify-end">
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
            label: "Workflows",
            children: tab === "workflows" ? children : null,
          },
          {
            key: "pages",
            label: "Pages",
            children: tab === "pages" ? children : null,
          },
          {
            key: "groups",
            label: "Groups",
            children: tab === "groups" ? children : null,
          },
          {
            key: "requests",
            label: "Requests",
            children: tab === "requests" ? children : null,
          },
        ]}
      />
    </>
  );
}

export function WorkflowsPanel({
  employerId,
  tab,
  workflows,
  pages,
  groups,
  changeRequests,
  changeRequestsScript,
  writesEnabled,
  pageName,
  groupId,
  requestId,
  workflowsScript,
  pagesScript,
  groupsScript,
}: {
  employerId: number;
  tab: WorkflowsTab;
  workflows: WorkflowListItem[];
  pages: WorkflowPageCatalogRow[];
  groups: WorkflowGroupRow[];
  changeRequests: ChangeRequestListItem[];
  changeRequestsScript: string;
  writesEnabled: boolean;
  pageName: string | null;
  groupId: number | null;
  requestId: number | null;
  workflowsScript: string;
  pagesScript: string;
  groupsScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const pageMatched = pageName
    ? pages.filter((row) => namesMatch(row.modulePageName, pageName))
    : pages;
  const pageMissing = pageName != null && pageMatched.length === 0;
  const visiblePages = pageMissing ? pages : pageMatched;
  const groupMatched = groupId == null ? groups : groups.filter((row) => groupIdMatches(row.roleId, groupId));
  const groupMissing = groupId != null && groupMatched.length === 0;
  const visibleGroups = groupMissing ? groups : groupMatched;

  return (
    <>
      {tab === "workflows" ? (
        <>
          <p className="mb-3 text-slate-600">{workflows.length} workflows</p>
          <DataTable
                queryScript={workflowsScript}
                rowKey="workflowId"
                dataSource={workflows}
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
                        <HighlightMatch text={name} />
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
        </>
      ) : null}
      {tab === "pages" ? (
        <>
          <p className="mb-3 text-slate-600">{visiblePages.length} pages</p>
          <FocusNote
                  clearLabel="All pages"
                  missing={pageMissing}
                  missingTitle={pageName ? `No page named ${pageName}.` : null}
                  title={pageName && !pageMissing ? `Page: ${pageName}` : null}
                  onClear={() => {
                    router.push(workflowsHref(employerId, "pages"));
                  }}
                />
                <DataTable
                queryScript={pagesScript}
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
                        <HighlightMatch text={name} />
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
      ) : null}
      {tab === "groups" ? (
        <>
          <p className="mb-3 text-slate-600">{visibleGroups.length} groups</p>
          <FocusNote
                  clearLabel="All groups"
                  missing={groupMissing}
                  missingTitle={groupId != null ? `No group with id ${groupId}.` : null}
                  title={groupId != null && !groupMissing ? `Group: ${groupId}` : null}
                  onClear={() => {
                    router.push(workflowsHref(employerId, "groups"));
                  }}
                />
                <DataTable
                queryScript={groupsScript}
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
                        <HighlightMatch text={name} />
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
      ) : null}
      {tab === "requests" ? (
        <>
          <p className="mb-3 text-slate-600">{changeRequests.length} requests</p>
          <ChangeRequestPanel
            employerId={employerId}
            queryScript={changeRequestsScript}
            requestId={requestId}
            requests={changeRequests}
            writesEnabled={writesEnabled}
          />
        </>
      ) : null}
    </>
  );
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
