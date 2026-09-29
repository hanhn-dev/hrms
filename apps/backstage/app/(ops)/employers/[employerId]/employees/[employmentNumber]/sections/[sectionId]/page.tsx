import { SectionRecordsScreen } from "@/features/employee/sections";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeSectionRecordsPage({
  params,
}: {
  params: Promise<{
    employerId: string;
    employmentNumber: string;
    sectionId: string;
  }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber, sectionId } = await params;
  return (
    <SectionRecordsScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
      sectionId={parsePositiveInt(sectionId)}
    />
  );
}
