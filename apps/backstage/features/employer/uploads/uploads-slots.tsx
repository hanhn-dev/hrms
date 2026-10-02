import { captureQueryScript } from "@hrms/db";
import { JobsTable } from "@/features/employer/uploads/jobs-table";
import {
  CatalogCountrySelect,
  UploadCatalogBody,
} from "@/features/employer/uploads/uploads-panel";
import {
  listUploadCatalog,
  listUploadCountries,
  listUploads,
} from "@/features/employer/uploads/queries";
import type { UploadTypeKey } from "@hrms/db";

export async function UploadsCountriesSlot({
  employerId,
  type,
  countryId,
  sectionId,
}: {
  employerId: number;
  type: UploadTypeKey;
  countryId: number;
  sectionId: number | null;
}): Promise<React.JSX.Element> {
  const countries = await listUploadCountries(employerId);
  return (
    <CatalogCountrySelect
      countries={countries}
      countryId={countryId}
      employerId={employerId}
      sectionId={sectionId}
      type={type}
    />
  );
}

export async function UploadsJobsSlot({
  employerId,
  jobType,
  jobStatus,
  jobUploadId,
}: {
  employerId: number;
  jobType: UploadTypeKey | null;
  jobStatus: string | null;
  jobUploadId: number | null;
}): Promise<React.JSX.Element> {
  const jobs = await captureQueryScript(() =>
    listUploads(employerId, {
      type: jobType,
      status: jobStatus,
      uploadId: jobUploadId,
    }),
  );
  return (
    <JobsTable
      employerId={employerId}
      jobs={jobs.result}
      queryScript={jobs.script}
      status={jobStatus}
      type={jobType}
      uploadId={jobUploadId}
    />
  );
}

export async function UploadsCatalogSlot({
  employerId,
  type,
  countryId,
  sectionId,
}: {
  employerId: number;
  type: UploadTypeKey;
  countryId: number;
  sectionId: number | null;
}): Promise<React.JSX.Element> {
  const catalog = await captureQueryScript(() =>
    listUploadCatalog(employerId, type, countryId),
  );
  return (
    <UploadCatalogBody
      catalog={catalog.result}
      catalogScript={catalog.script}
      employerId={employerId}
      sectionId={sectionId}
    />
  );
}
