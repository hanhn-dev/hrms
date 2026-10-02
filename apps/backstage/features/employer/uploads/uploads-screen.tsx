import { captureQueryScript } from "@hrms/db";
import { UploadsPanel } from "@/features/employer/uploads/uploads-panel";
import {
  listUploadCatalog,
  listUploadCountries,
  listUploads,
} from "@/features/employer/uploads/queries";
import type { UploadsView } from "@/features/employer/uploads/uploads-source";
import type { UploadTypeKey } from "@hrms/db";

export async function UploadsScreen({
  employerId,
  view,
  type,
  countryId,
  sectionId,
  jobType,
  jobStatus,
  jobUploadId,
}: {
  employerId: number;
  view: UploadsView;
  type: UploadTypeKey;
  countryId: number;
  sectionId: number | null;
  jobType: UploadTypeKey | null;
  jobStatus: string | null;
  jobUploadId: number | null;
}): Promise<React.JSX.Element> {
  const [countries, catalog, jobs] = await Promise.all([
    listUploadCountries(employerId),
    view === "catalog"
      ? captureQueryScript(() => listUploadCatalog(employerId, type, countryId))
      : Promise.resolve(null),
    view === "jobs"
      ? captureQueryScript(() =>
          listUploads(employerId, {
            type: jobType,
            status: jobStatus,
            uploadId: jobUploadId,
          }),
        )
      : Promise.resolve(null),
  ]);

  return (
    <UploadsPanel
      catalog={catalog?.result ?? null}
      catalogScript={catalog?.script ?? ""}
      countries={countries}
      employerId={employerId}
      jobStatus={jobStatus}
      jobType={jobType}
      jobUploadId={jobUploadId}
      jobs={jobs?.result ?? null}
      jobsScript={jobs?.script ?? ""}
      countryId={countryId}
      sectionId={sectionId}
      type={type}
      view={view}
    />
  );
}
