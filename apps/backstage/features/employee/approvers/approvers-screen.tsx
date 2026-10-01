import { Alert } from "antd";
import { ApproversTable } from "@/features/employee/approvers/approvers-table";
import { listEmployeeApprovers } from "@/features/employee/approvers/queries";
import { Employee360Nav, PageHelp } from "@/shared/ui";

export async function EmployeeApproversScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const result = await listEmployeeApprovers(employerId, employmentNumber);

  return (
    <>
      <PageHelp
        source="approvers"
        notes={[
          {
            id: "match",
            type: "info",
            title: "Who can approve requests this employee raises",
            description:
              "Each page uses the workflow that covers this employee's location and business unit. A custom workflow with no location or business unit is used when nothing more specific matches. A default workflow is used only when the page has no custom workflow.",
          },
          {
            id: "groups",
            type: "info",
            title: "Workflow groups",
            description:
              "A group member can approve only when the group is mapped to both this employee's location and business unit. Hiring manager, recruiter, and previous-level roles stay unresolved until a specific request exists.",
          },
        ]}
      />
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      {!result ? (
        <Alert showIcon type="error" title="Employee was not found." />
      ) : (
        <ApproversTable employerId={employerId} result={result} />
      )}
    </>
  );
}
