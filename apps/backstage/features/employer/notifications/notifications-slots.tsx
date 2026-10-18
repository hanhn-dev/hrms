import { captureQueryScript } from "@hrms/db";
import { NotificationsPanel } from "@/features/employer/notifications/notifications-panel";
import {
  resolveEmailWindow,
  type NotificationsQuery,
} from "@/features/employer/notifications/notifications-source";
import {
  listEmailNotifications,
  listPendingInbox,
} from "@/features/employer/notifications/queries";

export async function NotificationsSlot({
  employerId,
  query,
}: {
  employerId: number;
  query: NotificationsQuery;
}): Promise<React.JSX.Element> {
  const window = resolveEmailWindow(query);
  const [email, inbox] = await Promise.all([
    query.tab === "email"
      ? captureQueryScript(() =>
          listEmailNotifications(employerId, {
            module: query.module,
            status: query.status,
            template: query.template,
            transId: query.transId,
            createdFrom: window.from,
            createdTo: window.to,
            page: query.page,
          }),
        )
      : Promise.resolve(null),
    query.tab === "inbox"
      ? captureQueryScript(() =>
          listPendingInbox(employerId, {
            side: query.side,
            category: query.category,
            requestType: query.requestType,
            employee: query.employee,
            page: query.page,
          }),
        )
      : Promise.resolve(null),
  ]);

  return (
    <NotificationsPanel
      appliedFrom={window.from ? window.from.toISOString() : null}
      appliedTo={window.to ? window.to.toISOString() : null}
      email={email?.result ?? null}
      emailScript={email?.script ?? ""}
      employerId={employerId}
      inbox={inbox?.result ?? null}
      inboxScript={inbox?.script ?? ""}
      query={query}
      usingDefaultWindow={window.usingDefaultWindow}
    />
  );
}
