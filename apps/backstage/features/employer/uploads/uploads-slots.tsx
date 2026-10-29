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
  page,
  search,
}: {
  employerId: number;
  jobType: UploadTypeKey | null;
  jobStatus: string | null;
  jobUploadId: number | null;
  page: number;
  search: string;
}): Promise<React.JSX.Element> {
  const jobs = await captureQueryScript(() =>
    listUploads(employerId, {
      type: jobType,
      status: jobStatus,
      uploadId: jobUploadId,
      page,
      q: search,
    }),
  );
  return (
    <JobsTable
      employerId={employerId}
      jobs={jobs.result.rows}
      page={jobs.result.page}
      pageSize={jobs.result.pageSize}
      queryScript={jobs.script}
      search={search}
      status={jobStatus}
      total={jobs.result.totalCount}
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
  page,
  search,
}: {
  employerId: number;
  type: UploadTypeKey;
  countryId: number;
  sectionId: number | null;
  page: number;
  search: string;
}): Promise<React.JSX.Element> {
  const catalog = await captureQueryScript(() =>
    listUploadCatalog(employerId, type, countryId, {
      page,
      q: search,
      sectionId,
    }),
  );
  return (
    <UploadCatalogBody
      catalog={catalog.result}
      catalogScript={catalog.script}
      employerId={employerId}
      search={search}
      sectionId={sectionId}
    />
  );
}
