import { captureQueryScript } from "@hrms/db";
import { EmailTriggersPanel } from "@/features/employer/email-triggers/email-triggers-panel";
import {
  resolveEmailTriggersWindow,
  type EmailTriggersQuery,
} from "@/features/employer/email-triggers/email-triggers-source";
import { getEmailTriggerSummary } from "@/features/employer/email-triggers/queries";

export async function EmailTriggersSlot({
  employerId,
  query,
}: {
  employerId: number;
  query: EmailTriggersQuery;
}): Promise<React.JSX.Element> {
  const window = resolveEmailTriggersWindow(query);
  const summary = await captureQueryScript(() =>
    getEmailTriggerSummary(employerId, {
      module: query.module,
      createdFrom: window.from,
      createdTo: window.to,
    }),
  );

  return (
    <EmailTriggersPanel
      appliedFrom={window.from ? window.from.toISOString() : null}
      appliedTo={window.to ? window.to.toISOString() : null}
      employerId={employerId}
      query={query}
      queryScript={summary.script}
      summary={summary.result}
      usingDefaultWindow={window.usingDefaultWindow}
    />
  );
}
