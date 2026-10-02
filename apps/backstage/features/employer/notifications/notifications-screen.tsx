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
import { PageHelp } from "@/shared/ui/shell-header-context";

export async function NotificationsScreen({
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
    <>
      <PageHelp
        source="notifications"
        notes={[
          {
            id: "check-only",
            type: "info",
            title: "This page only checks notifications",
            description:
              "It does not approve, reject, reassign, or change email status, and it does not send mail.",
          },
          {
            id: "email-sources",
            type: "info",
            title: "Email rows follow the notification tables",
            description:
              "Core reads dbo.TEmailNotification. Training, Survey, Resource Allocation, and Travel and Expense read the TEMAIL_NOTIFICATION synonyms. Status words match New, Pending, Failed, and Completed. Any other stored value is shown as Other, with the raw value on the status tag.",
          },
          {
            id: "inbox-scope",
            type: "info",
            title: "Inbox is the pending workflow queue",
            description:
              "For Me lists pending requests waiting on a manager in this employer. By Me lists pending requests raised for an employee of this employer. Each request is one row, with every approver still waiting listed together. Request types are grouped by module.",
          },
        ]}
      />
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
    </>
  );
}
