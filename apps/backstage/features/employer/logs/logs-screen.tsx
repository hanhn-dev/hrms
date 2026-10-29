import { Suspense } from "react";
import { LogsSlot } from "@/features/employer/logs/logs-slots";
import type { LogsQuery, LogsTab } from "@/features/employer/logs/logs-source";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { PageHelp } from "@/shared/ui/shell-header-context";

const HELP = [
  {
    id: "writers",
    type: "info" as const,
    title: "Six writers, one window",
    description:
      "Activity is TActivityLog. Pages are TAuditTrail. Unhandled exceptions are ELMAH_Error. Handled exceptions are TErrorLog. Login steps are TLoginAuditTrail and are written only when this employer has EnableInsertLoginAuditTrail on. My Details is TMyDetailsEnhanced_ExecutionLog: each enhanced My Details procedure writes a call, and sometimes the dynamic SQL or the error. SQL errors are TSQL_Errorlogs. A row is listed when its parameter text names this employer or an employee of this employer. That list can look back 45 days. The other lists stay within 7 days.",
  },
  {
    id: "clocks",
    type: "info" as const,
    title: "Two clocks",
    description:
      "Activity and unhandled exceptions are stored in UTC and shown in the employer time zone. Page access, login steps, handled errors, My Details execution logs, and SQL errors use the database server clock and are not shifted again. The From and To filters are UTC. Server-local tables use that same window plus the employer offset. SQL errors can cover 45 days. The other tabs stay at 7 days.",
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

const TAB_TITLE: Record<LogsTab, string> = {
  activity: "Activity",
  pages: "Page access",
  exceptions: "Exceptions",
  login: "Login steps",
  mydetails: "My Details",
  sqlerrors: "SQL errors",
};

export function LogsScreen({
  employerId,
  query,
  writesEnabled,
}: {
  employerId: number;
  query: LogsQuery;
  writesEnabled: boolean;
}): React.JSX.Element {
  return (
    <>
      <PageHelp source="logs" notes={HELP} />
      <Suspense fallback={<SectionFallback title={TAB_TITLE[query.tab]} />}>
        <LogsSlot employerId={employerId} query={query} writesEnabled={writesEnabled} />
      </Suspense>
    </>
  );
}
