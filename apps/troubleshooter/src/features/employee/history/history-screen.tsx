import { Alert, Card } from "antd";
import {
  HISTORY_VIEW_TYPES,
  isHistorySectionName,
  type HistoryViewType,
} from "@hrms/db";
import { HistoryPanel } from "@/features/employee/history/history-panel";
import { getEmployeeHistoryChanges } from "@/features/employee/history/queries";
import { Employee360Nav, PageHelp } from "@/shared/ui";

function parseType(value: string | undefined): HistoryViewType {
  if (value && (HISTORY_VIEW_TYPES as readonly string[]).includes(value)) {
    return value as HistoryViewType;
  }
  return "History";
}

export async function EmployeeHistoryScreen({
  employerId,
  employmentNumber,
  type: typeRaw,
  section: sectionRaw,
  from,
  to,
  page: pageRaw,
}: {
  employerId: number;
  employmentNumber: string;
  type?: string;
  section?: string;
  from?: string;
  to?: string;
  page?: string;
}): Promise<React.JSX.Element> {
  const type = parseType(typeRaw);
  const section =
    sectionRaw && isHistorySectionName(sectionRaw) ? sectionRaw : null;
  const pageNumber = Math.max(1, Number(pageRaw ?? "1") || 1);
  const pageSize = 30;

  const result = await getEmployeeHistoryChanges(employerId, employmentNumber, {
    type,
    section,
    from: from ?? null,
    to: to ?? null,
    pageNumber,
    pageSize,
  });

  return (
    <>
      <PageHelp
        source="employee-history"
        notes={[
          {
            id: "approach",
            type: "info",
            title: "History is aggregated in application code",
            description:
              "Troubleshooter loads relational history / change-request / future rows and diffs them in TypeScript. It does not call My Details history stored procedures or build JSON in SQL.",
          },
          {
            id: "window",
            type: "info",
            title: "Past matches My Details when dates are empty",
            description:
              "With no date range, Past History loads the full timeline (same as My Details). Set from/to to narrow the window. Future and Pending ignore the date picker.",
          },
        ]}
      />
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      {!result ? (
        <Alert showIcon type="error" title="Employee was not found." />
      ) : (
        <Card title="History changes">
          <HistoryPanel
            type={type}
            section={section}
            from={from ?? null}
            to={to ?? null}
            pageNumber={pageNumber}
            pageSize={pageSize}
            totalItems={result.totalItems}
            events={result.data}
          />
        </Card>
      )}
    </>
  );
}
