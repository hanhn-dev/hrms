import { Suspense } from "react";
import { HISTORY_VIEW_TYPES, type HistoryViewType } from "@hrms/db";
import { resolveHistoryScreenFilters } from "@/features/employee/history/catalog";
import { EmployeeHistorySlot } from "@/features/employee/history/history-slots";
import { Employee360Nav, PageHelp, SectionFallback } from "@/shared/ui";

function parseType(value: string | undefined): HistoryViewType {
  if (value && (HISTORY_VIEW_TYPES as readonly string[]).includes(value)) {
    return value as HistoryViewType;
  }
  return "History";
}

export function EmployeeHistoryScreen({
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
}): React.JSX.Element {
  const type = parseType(typeRaw);
  const filters = resolveHistoryScreenFilters({
    section:
      sectionRaw ??
      (type === "Future" ? "Current Employment Details" : undefined),
    from,
    to,
  });
  const pageNumber = Math.max(1, Number(pageRaw ?? "1") || 1);
  const pageSize = 30;

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
            title: "Past defaults to the last 90 days",
            description:
              "The date picker starts with the last 90 days. Widen or narrow it as needed. Future and Pending ignore the date picker.",
          },
        ]}
      />
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Suspense fallback={<SectionFallback title="History changes" />}>
        <EmployeeHistorySlot
          employerId={employerId}
          employmentNumber={employmentNumber}
          from={filters.from || null}
          pageNumber={pageNumber}
          pageSize={pageSize}
          section={filters.section}
          to={filters.to || null}
          type={type}
        />
      </Suspense>
    </>
  );
}
