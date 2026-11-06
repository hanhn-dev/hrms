import { Suspense } from "react";
import { EmailTriggersSlot } from "@/features/employer/email-triggers/email-triggers-slots";
import type { EmailTriggersQuery } from "@/features/employer/email-triggers/email-triggers-source";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { PageHelp } from "@/shared/ui/shell-header-context";

export function EmailTriggersScreen({
  employerId,
  query,
}: {
  employerId: number;
  query: EmailTriggersQuery;
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="email-triggers"
        notes={[
          {
            id: "two-layers",
            type: "info",
            title: "Two layers of outbound email",
            description:
              "Trigger queue counts come from TEmailNotification and the module satellite tables. SMTP delivery counts come from the linked TEmail outbox row. A Completed trigger means the scheduler finished; it does not mean SendEmail.exe has delivered the message yet.",
          },
          {
            id: "hold-cancel",
            type: "info",
            title: "Hold and Cancel are not delivery statuses",
            description:
              "Those words appear in business template names. Stuck mail usually shows as Pending, Under Review, Queued, or Poisoned.",
          },
          {
            id: "drilldown",
            type: "info",
            title: "Trigger chips open Notifications",
            description:
              "Click a trigger status or module count to open the Email tab with the same window and filter. SMTP delivery chips stay on this page because Notifications does not filter by SendStatus yet.",
          },
          {
            id: "check-only",
            type: "info",
            title: "This page only summarizes email",
            description:
              "It does not retry, cancel, change status, or send mail.",
          },
        ]}
      />
      <Suspense fallback={<SectionFallback title="Email Triggers" />}>
        <EmailTriggersSlot employerId={employerId} query={query} />
      </Suspense>
    </>
  );
}
