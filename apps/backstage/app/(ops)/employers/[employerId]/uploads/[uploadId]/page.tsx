import { JobScreen } from "@/features/employer/uploads";
import {
  parseErrorClassParam,
  parseOptionalPositiveInt,
  parseSectionIdParam,
} from "@/features/employer/uploads";
import { parsePositiveInt } from "@/shared/routing";

export default async function UploadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string; uploadId: string }>;
  searchParams: Promise<{
    section?: string;
    sectionId?: string;
    error?: string;
    employeeId?: string;
    workEmail?: string;
    batchId?: string;
  }>;
}): Promise<React.JSX.Element> {
  const [{ employerId, uploadId }, query] = await Promise.all([params, searchParams]);
  return (
    <JobScreen
      employerId={parsePositiveInt(employerId)}
      uploadId={parsePositiveInt(uploadId)}
      uploadSectionId={parseOptionalPositiveInt(query.section)}
      sectionId={parseSectionIdParam(query.sectionId)}
      errorClass={parseErrorClassParam(query.error)}
      employeeId={parseOptionalPositiveInt(query.employeeId)}
      workEmail={query.workEmail?.trim() || null}
      batchId={parseOptionalPositiveInt(query.batchId)}
    />
  );
}
