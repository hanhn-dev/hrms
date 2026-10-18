import { Suspense } from "react";
import { Alert } from "antd";
import { EmployeeLeaveSlot } from "@/features/employee/leave/leave-slots";
import { Employee360Nav, SectionFallback } from "@/shared/ui";

export function EmployeeLeaveScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): React.JSX.Element {
  return (
    <>
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Alert
        className="mb-4"
        showIcon
        type="info"
        title="Raw tLeaveBalance rows"
        description="This is the stored balance, not SP_LA_GetEmployeeLeaveBalanceDetails eligibility/pending math."
      />
      <Suspense fallback={<SectionFallback title="Leave balances" />}>
        <EmployeeLeaveSlot employerId={employerId} employmentNumber={employmentNumber} />
      </Suspense>
    </>
  );
}
