import { Suspense } from "react";
import { EmployeeBusinessUnitSlot } from "@/features/employee/business-unit/business-unit-slots";
import { BusinessUnitSearchForm } from "@/features/employee/business-unit/business-unit-form";
import { Employee360Nav, PageHelp, SectionFallback } from "@/shared/ui";

export function EmployeeBusinessUnitScreen({
  employerId,
  employmentNumber,
  page,
  pageSize,
  search,
}: {
  employerId: number;
  employmentNumber: string;
  page: number;
  pageSize: number;
  search: string;
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="business-unit"
        notes={[
          {
            id: "scope",
            type: "info",
            title: "Search is scoped to this employee's business unit",
            description:
              "The list matches TEmployeeInfo.BusinessUnitId on the viewed employee, not the whole employer.",
          },
        ]}
      />
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <BusinessUnitSearchForm
        employerId={employerId}
        employmentNumber={employmentNumber}
        initialSearch={search}
        pageSize={pageSize}
      />
      <Suspense fallback={<SectionFallback title="Business unit" />}>
        <EmployeeBusinessUnitSlot
          employerId={employerId}
          employmentNumber={employmentNumber}
          page={page}
          pageSize={pageSize}
          search={search}
        />
      </Suspense>
    </>
  );
}
