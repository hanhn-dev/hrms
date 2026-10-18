import { Suspense } from "react";
import { NotificationsSlot } from "@/features/employer/notifications/notifications-slots";
import type { NotificationsQuery } from "@/features/employer/notifications/notifications-source";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { PageHelp } from "@/shared/ui/shell-header-context";

export function NotificationsScreen({
  employerId,
  query,
}: {
  employerId: number;
  query: NotificationsQuery;
}): React.JSX.Element {
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
      <Suspense
        fallback={
          <SectionFallback title={query.tab === "inbox" ? "Inbox" : "Email"} />
        }
      >
        <NotificationsSlot employerId={employerId} query={query} />
      </Suspense>
    </>
  );
}
