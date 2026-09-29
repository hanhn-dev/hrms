import {
  getCreationFinalize as getCreationFinalizeFromDb,
  getCreationStagingRow as getCreationStagingRowFromDb,
  getUpload as getUploadFromDb,
  getUploadBatch as getUploadBatchFromDb,
  getUploadLiveRow as getUploadLiveRowFromDb,
  listCreationStaging as listCreationStagingFromDb,
  listUploadBatches as listUploadBatchesFromDb,
  listUploadCatalog as listUploadCatalogFromDb,
  listUploadCountries as listUploadCountriesFromDb,
  listUploadExecutionErrors as listUploadExecutionErrorsFromDb,
  listUploadRowErrors as listUploadRowErrorsFromDb,
  listUploadSectionData as listUploadSectionDataFromDb,
  listUploads as listUploadsFromDb,
  type UploadCatalogField,
  type UploadErrorClass,
  type UploadListFilters,
  type UploadTypeKey,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  CreationFinalize,
  CreationStagingRow,
  CreationStagingSummary,
  UploadBatchDetail,
  UploadBatchRow,
  UploadCatalog,
  UploadCatalogField,
  UploadCatalogSection,
  UploadCountryOption,
  UploadDetail,
  UploadErrorClass,
  UploadExecutionError,
  UploadHeaderMismatch,
  UploadListItem,
  UploadLiveRow,
  UploadRowError,
  UploadRowErrorResult,
  UploadSectionData,
  UploadSectionDataRow,
  UploadSectionRollup,
  UploadTypeKey,
} from "@hrms/db";
export { compareUploadHeaders, UPLOAD_TYPE_LABELS } from "@hrms/db";

export async function listUploadCountries(employerId: number) {
  await requireRootAdmin();
  return listUploadCountriesFromDb(await getHrmsDb(), employerId);
}

export async function listUploadCatalog(
  employerId: number,
  type: UploadTypeKey,
  countryId: number,
) {
  await requireRootAdmin();
  return listUploadCatalogFromDb(await getHrmsDb(), employerId, type, countryId);
}

export async function listUploads(employerId: number, filters: UploadListFilters) {
  await requireRootAdmin();
  return listUploadsFromDb(await getHrmsDb(), employerId, filters);
}

export async function getUpload(employerId: number, uploadId: number) {
  await requireRootAdmin();
  return getUploadFromDb(await getHrmsDb(), employerId, uploadId);
}

export async function listUploadSectionData(
  employerId: number,
  uploadId: number,
  uploadSectionId: number | null,
) {
  await requireRootAdmin();
  return listUploadSectionDataFromDb(
    await getHrmsDb(),
    employerId,
    uploadId,
    uploadSectionId,
  );
}

export async function listUploadRowErrors(
  employerId: number,
  uploadId: number,
  sectionId: number | null,
  errorClass: Exclude<UploadErrorClass, "system">,
  catalogFields: UploadCatalogField[],
) {
  await requireRootAdmin();
  return listUploadRowErrorsFromDb(
    await getHrmsDb(),
    employerId,
    uploadId,
    sectionId,
    errorClass,
    catalogFields,
  );
}

export async function listUploadBatches(employerId: number, uploadId: number) {
  await requireRootAdmin();
  return listUploadBatchesFromDb(await getHrmsDb(), employerId, uploadId);
}

export async function getUploadBatch(
  employerId: number,
  uploadId: number,
  batchId: number,
) {
  await requireRootAdmin();
  return getUploadBatchFromDb(await getHrmsDb(), employerId, uploadId, batchId);
}

export async function listUploadExecutionErrors(employerId: number, uploadId: number) {
  await requireRootAdmin();
  return listUploadExecutionErrorsFromDb(await getHrmsDb(), employerId, uploadId);
}

export async function listCreationStaging(employerId: number, uploadId: number) {
  await requireRootAdmin();
  return listCreationStagingFromDb(await getHrmsDb(), employerId, uploadId);
}

export async function getCreationFinalize(employerId: number, uploadId: number) {
  await requireRootAdmin();
  return getCreationFinalizeFromDb(await getHrmsDb(), employerId, uploadId);
}

export async function getUploadLiveRow(
  employerId: number,
  identity: { employeeId?: number | null; workEmail?: string | null },
) {
  await requireRootAdmin();
  return getUploadLiveRowFromDb(await getHrmsDb(), employerId, identity);
}

export async function getCreationStagingRow(
  employerId: number,
  uploadId: number,
  workEmail: string,
) {
  await requireRootAdmin();
  return getCreationStagingRowFromDb(await getHrmsDb(), employerId, uploadId, workEmail);
}
