import { Suspense } from "react";
import { EmployeeChangeRequestsSlot } from "@/features/employee/change-requests/change-requests-slots";
import { Employee360Nav, PageHelp, SectionFallback } from "@/shared/ui";

export function EmployeeChangeRequestsScreen({
  employerId,
  employmentNumber,
  page,
  search,
  status,
}: {
  employerId: number;
  employmentNumber: string;
  page: number;
  search: string;
  status: "pending" | "approved" | "rejected" | "all";
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="employee-change-requests"
        notes={[
          {
            id: "subject",
            type: "info",
            title: "Requests for this employee",
            description:
              "Each row is a My Details change request where this person is the subject. Requested by shows who submitted it, including changes filed on their behalf. Approver is who the request is waiting on, or the person who approved or rejected a closed request.",
          },
          {
            id: "groups",
            type: "info",
            title: "Grouped by workflow",
            description:
              "Requests are grouped by the workflow that owns them. A request with no workflow queue sits under No workflow. Groups that still have pending requests start open.",
          },
          {
            id: "change-request-apply",
            type: "info",
            title: "Change-request approve",
            description:
              "Approve on a pending row applies the field diffs and closes the queue. It does not call the product stored procedure, send approval email, or insert the next routing level. Reject closes the queue and does not apply live field diffs.",
          },
        ]}
      />
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Suspense fallback={<SectionFallback title="Change requests" />}>
        <EmployeeChangeRequestsSlot
          employerId={employerId}
          employmentNumber={employmentNumber}
          page={page}
          search={search}
          status={status}
        />
      </Suspense>
    </>
  );
}
