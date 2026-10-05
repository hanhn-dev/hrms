import { captureQueryScript } from "@hrms/db";
import { notFound } from "next/navigation";
import { LogsPanel } from "@/features/employer/logs/logs-panel";
import {
  resolveLogWindow,
  type LogsQuery,
} from "@/features/employer/logs/logs-source";
import {
  getLogEmployerContext,
  listActivityLogs,
  listExceptionLogs,
  listLoginSteps,
  listMyDetailsExecutionLogs,
  listPageSessions,
  listSessionPages,
} from "@/features/employer/logs/queries";
import { PageHelp } from "@/shared/ui/shell-header-context";

const HELP = [
  {
    id: "writers",
    type: "info" as const,
    title: "Five writers, one window",
    description:
      "Activity is TActivityLog. Pages are TAuditTrail. Unhandled exceptions are ELMAH_Error. Handled exceptions are TErrorLog. Login steps are TLoginAuditTrail and are written only when this employer has EnableInsertLoginAuditTrail on. My Details is TMyDetailsEnhanced_ExecutionLog: each enhanced My Details procedure writes a call, and sometimes the dynamic SQL or the error.",
  },
  {
    id: "clocks",
    type: "info" as const,
    title: "Two clocks",
    description:
      "Activity and unhandled exceptions are stored in UTC and shown in the employer time zone. Page access, login steps, handled errors, and My Details execution logs use the database server clock and are not shifted again. The From and To filters are UTC. Server-local tables use that same window plus the employer offset.",
  },
  {
    id: "labels",
    type: "info" as const,
    title: "Activity names past type 135",
    description:
      "TActivityLogTypes stops at type 135. Later HRMS.Web activity ids are labeled from the ActivityDescription enum. A catalog description still wins when one exists.",
  },
  {
    id: "logout",
    type: "info" as const,
    title: "Logout rows have no employer",
    description:
      "A logout is stored with employee id 0, so it does not appear on an employer activity list.",
  },
  {
    id: "handled",
    type: "warning" as const,
    title: "Handled errors are not tied to a person",
    description:
      "ErrorLog.LogError always stores the user as test, and it cuts the message at 100 characters and the stack at 500. That list ignores the person filter. The exception detail shows the stack trace only, not the raw ELMAH document.",
  },
  {
    id: "other-logs",
    type: "info" as const,
    title: "Feature histories stay on their own pages",
    description:
      "Bulk attendance, leave, and resignation activity tables are not application logs and are not listed here.",
  },
];

export async function LogsScreen({
  employerId,
  query,
}: {
  employerId: number;
  query: LogsQuery;
}): Promise<React.JSX.Element> {
  const context = await getLogEmployerContext(employerId);
  if (!context) {
    notFound();
  }
  const window = resolveLogWindow(query, context.offset?.offsetMinutes ?? 0);
  const filters = {
    person: query.employee,
    text: query.text,
    page: query.page,
    from: window.from,
    to: window.to,
    serverFrom: window.serverFrom,
    serverTo: window.serverTo,
  };
  const serverFilters = {
    ...filters,
    from: window.serverFrom,
    to: window.serverTo,
  };

  const activity =
    query.tab === "activity"
      ? await captureQueryScript(() => listActivityLogs(employerId, filters))
      : null;
  const pages =
    query.tab === "pages" && !query.sessionId
      ? await captureQueryScript(() => listPageSessions(employerId, serverFilters))
      : null;
  const hits =
    query.tab === "pages" && query.sessionId
      ? await captureQueryScript(() =>
          listSessionPages(employerId, {
            ...serverFilters,
            sessionId: query.sessionId ?? "",
          }),
        )
      : null;
  const exceptions =
    query.tab === "exceptions"
      ? await captureQueryScript(() => listExceptionLogs(employerId, filters))
      : null;
  const login =
    query.tab === "login"
      ? await captureQueryScript(() => listLoginSteps(employerId, filters))
      : null;
  const myDetails =
    query.tab === "mydetails"
      ? await captureQueryScript(() => listMyDetailsExecutionLogs(employerId, serverFilters))
      : null;

  return (
    <>
      <PageHelp source="logs" notes={HELP} />
      <LogsPanel
        activity={activity?.result ?? null}
        activityScript={activity?.script ?? ""}
        appliedFrom={window.from.toISOString()}
        appliedTo={window.to.toISOString()}
        employerId={employerId}
        exceptions={exceptions?.result ?? null}
        exceptionsScript={exceptions?.script ?? ""}
        hits={hits?.result ?? null}
        hitsScript={hits?.script ?? ""}
        login={login?.result ?? null}
        loginAuditEnabled={context.loginAuditEnabled}
        loginScript={login?.script ?? ""}
        myDetails={myDetails?.result ?? null}
        myDetailsScript={myDetails?.script ?? ""}
        offsetLabel={context.offset?.label ?? "UTC"}
        offsetMinutes={context.offset?.offsetMinutes ?? 0}
        pages={pages?.result ?? null}
        pagesScript={pages?.script ?? ""}
        query={query}
        usingDefaultWindow={window.usingDefaultWindow}
        windowLimited={window.windowLimited}
      />
    </>
  );
}
