import { UploadsScreen } from "@/features/employer/uploads";
import {
  parseCountryIdParam,
  parseOptionalPositiveInt,
  parseOptionalUploadType,
  parseSectionIdParam,
  parseUploadTypeParam,
  parseUploadsView,
} from "@/features/employer/uploads";
import { parsePositiveInt } from "@/shared/routing";

export default async function UploadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{
    view?: string;
    type?: string;
    countryId?: string;
    sectionId?: string;
    status?: string;
    uploadId?: string;
  }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  const view = parseUploadsView(query.view);
  return (
    <UploadsScreen
      employerId={parsePositiveInt(employerId)}
      view={view}
      type={parseUploadTypeParam(query.type)}
      countryId={parseCountryIdParam(query.countryId)}
      sectionId={parseSectionIdParam(query.sectionId)}
      jobType={parseOptionalUploadType(query.type)}
      jobStatus={query.status?.trim() || null}
      jobUploadId={parseOptionalPositiveInt(query.uploadId)}
    />
  );
}
