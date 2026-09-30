"use client";

import { Alert, Tabs } from "antd";
import { useRouter } from "next/navigation";
import { EmailPanel } from "@/features/employer/notifications/email-panel";
import { InboxPanel } from "@/features/employer/notifications/inbox-panel";
import {
  notificationsHref,
  type NotificationsQuery,
} from "@/features/employer/notifications/notifications-source";
import type {
  EmailNotificationList,
  PendingInboxList,
} from "@/features/employer/notifications/queries";

export function NotificationsPanel({
  employerId,
  query,
  appliedFrom,
  appliedTo,
  usingDefaultWindow,
  email,
  inbox,
}: {
  employerId: number;
  query: NotificationsQuery;
  appliedFrom: string | null;
  appliedTo: string | null;
  usingDefaultWindow: boolean;
  email: EmailNotificationList | null;
  inbox: PendingInboxList | null;
}): React.JSX.Element {
  const router = useRouter();

  return (
    <Tabs
      activeKey={query.tab}
      onChange={(next) => {
        router.push(
          notificationsHref(employerId, {
            ...query,
            tab: next === "inbox" ? "inbox" : "email",
            page: 1,
          }),
        );
      }}
      items={[
        {
          key: "email",
          label: "Email",
          children: email ? (
            <>
              {email.satellitesUnavailable ? (
                <Alert
                  className="mb-4"
                  showIcon
                  type="warning"
                  title="Some module notification tables could not be read. Core notifications are still listed."
                />
              ) : null}
              <EmailPanel
                appliedFrom={appliedFrom}
                appliedTo={appliedTo}
                employerId={employerId}
                query={query}
                result={email}
                usingDefaultWindow={usingDefaultWindow}
              />
            </>
          ) : null,
        },
        {
          key: "inbox",
          label: "Inbox",
          children: inbox ? (
            <InboxPanel employerId={employerId} query={query} result={inbox} />
          ) : null,
        },
      ]}
    />
  );
}
