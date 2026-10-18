import { captureQueryScript } from "@hrms/db";
import { notFound } from "next/navigation";
import { LogsPanel } from "@/features/employer/logs/logs-panel";
import { resolveLogWindow, type LogsQuery } from "@/features/employer/logs/logs-source";
import {
  getLogEmployerContext,
  listActivityLogs,
  listExceptionLogs,
  listLoginSteps,
  listMyDetailsExecutionLogs,
  listPageSessions,
  listSessionPages,
} from "@/features/employer/logs/queries";

export async function LogsSlot({
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
  );
}
