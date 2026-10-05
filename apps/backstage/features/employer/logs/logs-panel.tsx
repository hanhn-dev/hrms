"use client";

import { Alert, Button, DatePicker, Input, Tabs } from "antd";
import type { TablePaginationConfig } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ElmahStack } from "@/features/employer/logs/elmah-stack";
import {
  logsHref,
  type LogsQuery,
  type LogsTab,
} from "@/features/employer/logs/logs-source";
import type {
  ActivityLogList,
  ActivityLogRow,
  ExceptionLogList,
  LoginStepList,
  MyDetailsExecutionLogList,
  MyDetailsExecutionLogRow,
  PageHitRow,
  PageSessionList,
} from "@/features/employer/logs/queries";
import { EntityLink } from "@/shared/entity-link";
import { formatDate } from "@/shared/format-date";
import { DataTable, HighlightMatch } from "@/shared/ui";

dayjs.extend(utc);

function highlightQuery(query: LogsQuery): string {
  return `${query.employee ?? ""} ${query.text ?? ""}`.trim();
}

function formatShifted(value: string | null, offsetMinutes: number): string {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return formatDate(new Date(parsed.getTime() + offsetMinutes * 60_000).toISOString());
}

function text(value: string | null | undefined): string {
  return value?.trim() || "—";
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}): React.JSX.Element | null {
  if (!value) {
    return null;
  }
  return (
    <div className="mt-2">
      <div className="text-xs text-slate-500">{label}</div>
      <pre className="max-w-full whitespace-pre-wrap text-xs">{value}</pre>
    </div>
  );
}

function InstantPicker({
  value,
  placeholder,
  onChange,
}: {
  value: string | null;
  placeholder: string;
  onChange: (value: string | null) => void;
}): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Input
        readOnly
        className="w-52"
        placeholder={placeholder}
        value={value ? formatDate(value, "DD-MMM-YYYY HH:mm") : ""}
      />
    );
  }

  return (
    <DatePicker
      showTime={{ format: "HH:mm" }}
      format="DD-MMM-YYYY HH:mm"
      placeholder={placeholder}
      value={value ? dayjs.utc(value) : null}
      onChange={(next) => {
        onChange(next ? next.toDate().toISOString() : null);
      }}
    />
  );
}

function pager(
  page: number,
  pageSize: number,
  total: number,
  onChange: (page: number) => void,
): TablePaginationConfig {
  return {
    current: page,
    pageSize,
    total,
    showSizeChanger: false,
    onChange,
  };
}

export function LogsPanel({
  employerId,
  query,
  appliedFrom,
  appliedTo,
  usingDefaultWindow,
  windowLimited,
  offsetLabel,
  offsetMinutes,
  loginAuditEnabled,
  activity,
  activityScript,
  pages,
  pagesScript,
  hits,
  hitsScript,
  exceptions,
  exceptionsScript,
  login,
  loginScript,
  myDetails,
  myDetailsScript,
}: {
  employerId: number;
  query: LogsQuery;
  appliedFrom: string;
  appliedTo: string;
  usingDefaultWindow: boolean;
  windowLimited: boolean;
  offsetLabel: string;
  offsetMinutes: number;
  loginAuditEnabled: boolean;
  activity: ActivityLogList | null;
  activityScript: string;
  pages: PageSessionList | null;
  pagesScript: string;
  hits: PageHitRow[] | null;
  hitsScript: string;
  exceptions: ExceptionLogList | null;
  exceptionsScript: string;
  login: LoginStepList | null;
  loginScript: string;
  myDetails: MyDetailsExecutionLogList | null;
  myDetailsScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const marked = highlightQuery(query);

  const push = (patch: Partial<LogsQuery>): void => {
    router.push(
      logsHref(employerId, {
        ...query,
        ...patch,
        page: patch.page ?? 1,
      }),
    );
  };

  const activityColumns = [
    {
      title: `Time (${offsetLabel})`,
      dataIndex: "loggedDate",
      render: (_: unknown, row: ActivityLogRow) =>
        formatShifted(row.loggedDate, offsetMinutes),
    },
    {
      title: "Person",
      dataIndex: "userName",
      render: (_: unknown, row: ActivityLogRow) => {
        const name = row.userName || row.employmentNumber || "—";
        const link = row.employmentNumber ? (
          <EntityLink
            employerId={employerId}
            entity={{ kind: "employee", employmentNumber: row.employmentNumber }}
          >
            <HighlightMatch query={marked} text={name} />
          </EntityLink>
        ) : (
          <HighlightMatch query={marked} text={name} />
        );
        return (
          <div>
            {link}
            {row.employmentNumber && row.userName ? (
              <div className="text-xs text-slate-500">
                <HighlightMatch query={marked} text={row.employmentNumber} />
              </div>
            ) : null}
          </div>
        );
      },
    },
    { title: "Role", dataIndex: "userRole", render: (value: string | null) => text(value) },
    {
      title: "What",
      dataIndex: "label",
      render: (value: string) => <HighlightMatch query={marked} text={value} />,
    },
    {
      title: "Where",
      dataIndex: "place",
      render: (value: string | null) => (
        <HighlightMatch query={marked} text={text(value)} />
      ),
    },
    {
      title: "Comments",
      dataIndex: "comments",
      render: (value: string | null) => (
        <HighlightMatch query={marked} text={text(value)} />
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input.Search
          key={query.employee ?? ""}
          allowClear
          className="w-64"
          defaultValue={query.employee ?? ""}
          placeholder="Employment number or name"
          onSearch={(value) => {
            push({ employee: value.trim() || null, sessionId: null });
          }}
        />
        <Input.Search
          key={query.text ?? "text"}
          allowClear
          className="w-64"
          defaultValue={query.text ?? ""}
          placeholder="Search the visible text"
          onSearch={(value) => {
            push({ text: value.trim() || null, sessionId: null });
          }}
        />
        <InstantPicker
          placeholder="From (UTC)"
          value={appliedFrom}
          onChange={(from) => {
            push({ from, sessionId: null });
          }}
        />
        <InstantPicker
          placeholder="To (UTC)"
          value={appliedTo}
          onChange={(to) => {
            push({ to, sessionId: null });
          }}
        />
      </div>
      {usingDefaultWindow ? (
        <p className="mb-3 text-sm text-slate-500">Showing the last 24 hours.</p>
      ) : null}
      {windowLimited ? (
        <Alert
          className="mb-3"
          showIcon
          type="warning"
          title="The time window is limited to 7 days."
        />
      ) : null}
      <p className="mb-3 text-sm text-slate-500">
        Activity and unhandled exceptions are shown in {offsetLabel}. Page access,
        login steps, handled errors, and My Details use the database server clock.
      </p>
      <Tabs
        activeKey={query.tab}
        onChange={(next) => {
          push({ tab: next as LogsTab, page: 1 });
        }}
        items={[
          {
            key: "activity",
            label: "Activity",
            children: activity ? (
              <DataTable
                columns={activityColumns}
                dataSource={activity.rows}
                expandable={{
                  expandedRowRender: (row: ActivityLogRow) => (
                    <div className="text-sm">
                      <div>Type {row.activityTypeId ?? "—"}</div>
                      <div>IP {text(row.ipAddress)}</div>
                      <div>Browser {text(row.browser)}</div>
                      <div>Host {text(row.hostName)}</div>
                    </div>
                  ),
                }}
                pagination={pager(activity.page, activity.pageSize, activity.totalCount, (page) => {
                  push({ page });
                })}
                queryScript={activityScript}
                rowKey="logId"
                scroll={{ x: "max-content" }}
                size="small"
              />
            ) : null,
          },
          {
            key: "pages",
            label: "Pages",
            children: query.sessionId && hits ? (
              <>
                <Button
                  className="mb-3"
                  onClick={() => {
                    push({ sessionId: null });
                  }}
                >
                  All sessions
                </Button>
                <DataTable
                  columns={[
                    {
                      title: "Time (server)",
                      dataIndex: "accessTime",
                      render: (value: string | null) => formatDate(value),
                    },
                    {
                      title: "User",
                      dataIndex: "userName",
                      render: (value: string | null) => (
                        <HighlightMatch query={marked} text={text(value)} />
                      ),
                    },
                    {
                      title: "Page",
                      dataIndex: "readablePage",
                      render: (_: unknown, row: PageHitRow) => (
                        <div>
                          <HighlightMatch query={marked} text={row.readablePage || row.pageName} />
                          <div className="text-xs text-slate-500">{row.pageName}</div>
                        </div>
                      ),
                    },
                  ]}
                  dataSource={hits}
                  pagination={false}
                  queryScript={hitsScript}
                  rowKey="id"
                  scroll={{ x: "max-content" }}
                  size="small"
                />
              </>
            ) : pages ? (
              <DataTable
                columns={[
                  {
                    title: "Last (server)",
                    dataIndex: "lastAccess",
                    render: (value: string | null) => formatDate(value),
                  },
                  {
                    title: "First (server)",
                    dataIndex: "firstAccess",
                    render: (value: string | null) => formatDate(value),
                  },
                  {
                    title: "User",
                    dataIndex: "userName",
                    render: (value: string | null) => (
                      <HighlightMatch query={marked} text={text(value)} />
                    ),
                  },
                  { title: "Pages", dataIndex: "pageCount" },
                  {
                    title: "Session",
                    dataIndex: "sessionId",
                    render: (value: string) => (
                      <Button
                        type="link"
                        onClick={() => {
                          push({ sessionId: value });
                        }}
                      >
                        {value}
                      </Button>
                    ),
                  },
                ]}
                dataSource={pages.rows}
                pagination={pager(pages.page, pages.pageSize, pages.totalCount, (page) => {
                  push({ page });
                })}
                queryScript={pagesScript}
                rowKey="sessionId"
                scroll={{ x: "max-content" }}
                size="small"
              />
            ) : null,
          },
          {
            key: "exceptions",
            label: "Exceptions",
            children: exceptions ? (
              <>
                <DataTable
                  columns={[
                    {
                      title: `Time (${offsetLabel})`,
                      dataIndex: "timeUtc",
                      render: (value: string | null) => formatShifted(value, offsetMinutes),
                    },
                    {
                      title: "User",
                      dataIndex: "userName",
                      render: (value: string) => (
                        <HighlightMatch query={marked} text={text(value)} />
                      ),
                    },
                    { title: "Status", dataIndex: "statusCode" },
                    { title: "Type", dataIndex: "shortType" },
                    {
                      title: "Message",
                      dataIndex: "message",
                      render: (value: string) => (
                        <HighlightMatch query={marked} text={text(value)} />
                      ),
                    },
                  ]}
                  dataSource={exceptions.elmah}
                  expandable={{
                    expandedRowRender: (row) => (
                      <ElmahStack employerId={employerId} errorId={row.errorId} />
                    ),
                  }}
                  pagination={pager(
                    exceptions.page,
                    exceptions.pageSize,
                    exceptions.elmahTotal,
                    (page) => {
                      push({ page });
                    },
                  )}
                  queryScript={exceptionsScript}
                  rowKey="errorId"
                  scroll={{ x: "max-content" }}
                  size="small"
                />
                <h2 className="mb-2 mt-6 text-base font-medium">Handled errors</h2>
                <p className="mb-3 text-sm text-slate-500">
                  These rows are application-wide. HRMS.Web stores the user as test, so
                  the person filter does not apply. The message is cut at 100 characters
                  and the stack at 500. Times use the database server clock.
                </p>
                <DataTable
                  columns={[
                    {
                      title: "Time (server)",
                      dataIndex: "occurredOn",
                      render: (value: string | null) => formatDate(value),
                    },
                    { title: "User", dataIndex: "userName", render: (value: string | null) => text(value) },
                    {
                      title: "Message",
                      dataIndex: "message",
                      render: (value: string | null) => (
                        <HighlightMatch query={query.text ?? ""} text={text(value)} />
                      ),
                    },
                  ]}
                  dataSource={exceptions.handled}
                  expandable={{
                    expandedRowRender: (row) => (
                      <pre className="max-w-full whitespace-pre-wrap text-xs">
                        {row.stackTrace || "No stack trace was stored."}
                      </pre>
                    ),
                  }}
                  pagination={pager(
                    exceptions.page,
                    exceptions.pageSize,
                    exceptions.handledTotal,
                    (page) => {
                      push({ page });
                    },
                  )}
                  queryScript={exceptionsScript}
                  rowKey="errorId"
                  scroll={{ x: "max-content" }}
                  size="small"
                />
              </>
            ) : null,
          },
          {
            key: "login",
            label: "Login steps",
            children: login ? (
              <>
                {loginAuditEnabled ? null : (
                  <Alert
                    className="mb-3"
                    showIcon
                    type="info"
                    title="Login steps are not being recorded for this employer."
                    description="EnableInsertLoginAuditTrail is off, so new sign-ins do not write TLoginAuditTrail."
                  />
                )}
                <DataTable
                  columns={[
                    {
                      title: "Time (server)",
                      dataIndex: "accessTime",
                      render: (value: string | null) => formatDate(value),
                    },
                    {
                      title: "User",
                      dataIndex: "userName",
                      render: (value: string) => (
                        <HighlightMatch query={marked} text={text(value)} />
                      ),
                    },
                    {
                      title: "Step",
                      dataIndex: "step",
                      render: (value: string) => (
                        <HighlightMatch query={marked} text={text(value)} />
                      ),
                    },
                  ]}
                  dataSource={login.rows}
                  pagination={pager(login.page, login.pageSize, login.totalCount, (page) => {
                    push({ page });
                  })}
                  queryScript={loginScript}
                  rowKey="id"
                  scroll={{ x: "max-content" }}
                  size="small"
                />
              </>
            ) : null,
          },
          {
            key: "mydetails",
            label: "My Details",
            children: myDetails ? (
              <DataTable
                columns={[
                  {
                    title: "Time (server)",
                    dataIndex: "createdDate",
                    render: (value: string | null) => formatDate(value),
                  },
                  {
                    title: "Person",
                    dataIndex: "userName",
                    render: (_: unknown, row: MyDetailsExecutionLogRow) => {
                      const name = row.userName || row.employmentNumber || "—";
                      const link = row.employmentNumber ? (
                        <EntityLink
                          employerId={employerId}
                          entity={{
                            kind: "employee",
                            employmentNumber: row.employmentNumber,
                          }}
                        >
                          <HighlightMatch query={marked} text={name} />
                        </EntityLink>
                      ) : (
                        <HighlightMatch query={marked} text={name} />
                      );
                      return (
                        <div>
                          {link}
                          {row.employmentNumber && row.userName ? (
                            <div className="text-xs text-slate-500">
                              <HighlightMatch query={marked} text={row.employmentNumber} />
                            </div>
                          ) : null}
                        </div>
                      );
                    },
                  },
                  {
                    title: "Type",
                    dataIndex: "logType",
                    render: (value: string) => <HighlightMatch query={marked} text={value} />,
                  },
                  {
                    title: "Procedure",
                    dataIndex: "procedureName",
                    render: (value: string) => <HighlightMatch query={marked} text={value} />,
                  },
                  {
                    title: "Section",
                    dataIndex: "sectionName",
                    render: (_: unknown, row: MyDetailsExecutionLogRow) => (
                      <HighlightMatch
                        query={marked}
                        text={row.sectionName || row.sectionId || "—"}
                      />
                    ),
                  },
                  {
                    title: "Error",
                    dataIndex: "errorMessage",
                    render: (value: string | null) => (
                      <HighlightMatch query={marked} text={text(value)} />
                    ),
                  },
                ]}
                dataSource={myDetails.rows}
                expandable={{
                  expandedRowRender: (row: MyDetailsExecutionLogRow) => (
                    <div className="text-sm">
                      <div>Called by {text(row.calledByLogin)}</div>
                      <div>Login id {row.loginId ?? "—"}</div>
                      <div>Record {row.recordIndex ?? "—"}</div>
                      {row.errorNumber != null ? (
                        <div>
                          Error {row.errorNumber}
                          {row.errorProcedure ? ` in ${row.errorProcedure}` : ""}
                          {row.errorLine != null ? ` line ${row.errorLine}` : ""}
                          {row.errorSeverity != null ? `, severity ${row.errorSeverity}` : ""}
                          {row.errorState != null ? `, state ${row.errorState}` : ""}
                        </div>
                      ) : null}
                      <DetailBlock label="Parameters" value={row.parameters} />
                      <DetailBlock label="Dynamic SQL" value={row.dynamicSql} />
                      <DetailBlock label="Error" value={row.errorMessage} />
                      <DetailBlock label="Additional info" value={row.additionalInfo} />
                    </div>
                  ),
                }}
                pagination={pager(
                  myDetails.page,
                  myDetails.pageSize,
                  myDetails.totalCount,
                  (page) => {
                    push({ page });
                  },
                )}
                queryScript={myDetailsScript}
                rowKey="logId"
                scroll={{ x: "max-content" }}
                size="small"
              />
            ) : null,
          },
        ]}
      />
    </>
  );
}
