import { cache } from "react";
import { captureQueryScript, compareUploadHeaders } from "@hrms/db";
import { isMissingObjectError } from "@hrms/db/uploads";
import type { UploadTypeKey } from "@hrms/db/uploads";
import { getEmployeeAccess } from "@/features/employee/access/queries";
import { getEmployeeLoginInfo } from "@/features/employee/login/queries";
import { getEmployeeProfile } from "@/features/employee/profile/queries";
import {
  JobBatchesCard,
  JobEmployeeSlot,
  JobRowErrorsCard,
  JobSectionDataCard,
  JobSectionsCard,
  JobStagingCard,
} from "@/features/employer/uploads/job-panel";
import {
  getCreationFinalize,
  getCreationStagingRow,
  getUploadBatch,
  getUploadLiveRow,
  listCreationStaging,
  listUploadBatches,
  listUploadCatalog,
  listUploadExecutionErrors,
  listUploadRowErrors,
  listUploadSectionData,
  type UploadCatalogField,
  type UploadDetail,
  type UploadErrorClass,
  type UploadSectionRollup,
} from "@/features/employer/uploads/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

const loadCatalog = cache((employerId: number, type: UploadTypeKey, countryId: number) =>
  listUploadCatalog(employerId, type, countryId),
);

export async function UploadSectionsSlot({
  employerId,
  upload,
  errorClass,
  selectedSection,
  sectionsScript,
}: {
  employerId: number;
  upload: UploadDetail;
  errorClass: UploadErrorClass;
  selectedSection: UploadSectionRollup | null;
  sectionsScript: string;
}): Promise<React.JSX.Element> {
  const catalog =
    upload.type != null
      ? await loadCatalog(employerId, upload.type, upload.countryId ?? 0)
      : null;
  const mismatches = upload.sections.map((section) => {
    const catalogFields =
      upload.type === "image" || section.sectionId == null
        ? (catalog?.fields ?? [])
        : (catalog?.fields.filter((field) => field.sectionId === section.sectionId) ?? []);
    return {
      ...compareUploadHeaders(
        section.fieldsCsv,
        catalogFields.map((field) => field.displayText),
      ),
      sectionId: section.sectionId,
    };
  });
  return (
    <JobSectionsCard
      catalog={catalog}
      employerId={employerId}
      errorClass={errorClass}
      mismatches={mismatches}
      sectionsScript={sectionsScript}
      selectedSection={selectedSection}
      upload={upload}
    />
  );
}

export async function UploadSectionDataSlot({
  employerId,
  upload,
  errorClass,
  selectedSection,
}: {
  employerId: number;
  upload: UploadDetail;
  errorClass: UploadErrorClass;
  selectedSection: UploadSectionRollup | null;
}): Promise<React.JSX.Element> {
  const sectionData = await captureQueryScript(() =>
    listUploadSectionData(employerId, upload.uploadId, selectedSection?.uploadSectionId ?? null),
  );
  return (
    <JobSectionDataCard
      employerId={employerId}
      errorClass={errorClass}
      sectionData={sectionData.result}
      sectionDataScript={sectionData.script}
      selectedSection={selectedSection}
      upload={upload}
    />
  );
}

export async function UploadRowErrorsSlot({
  employerId,
  upload,
  errorClass,
  selectedSection,
}: {
  employerId: number;
  upload: UploadDetail;
  errorClass: UploadErrorClass;
  selectedSection: UploadSectionRollup | null;
}): Promise<React.JSX.Element> {
  const executionErrorsPromise = loadCaptured(
    () => listUploadExecutionErrors(employerId, upload.uploadId),
    [],
  );
  const catalog =
    upload.type != null
      ? await loadCatalog(employerId, upload.type, upload.countryId ?? 0)
      : null;
  const catalogFields =
    upload.type === "image"
      ? (catalog?.fields ?? [])
      : (catalog?.fields.filter((field) => field.sectionId === selectedSection?.sectionId) ?? []);
  const [rowErrors, executionErrors] = await Promise.all([
    loadRowErrors(
      errorClass,
      employerId,
      upload.uploadId,
      selectedSection?.sectionId ?? null,
      catalogFields,
    ),
    executionErrorsPromise,
  ]);
  return (
    <JobRowErrorsCard
      employerId={employerId}
      errorClass={errorClass}
      executionErrors={executionErrors.result}
      executionErrorsScript={executionErrors.script}
      rowErrors={rowErrors?.result ?? null}
      rowErrorsScript={rowErrors?.script ?? ""}
      selectedSection={selectedSection}
      upload={upload}
    />
  );
}

export async function UploadBatchesSlot({
  employerId,
  upload,
  errorClass,
  selectedSection,
  batchId,
}: {
  employerId: number;
  upload: UploadDetail;
  errorClass: UploadErrorClass;
  selectedSection: UploadSectionRollup | null;
  batchId: number | null;
}): Promise<React.JSX.Element> {
  const [batches, selectedBatch] = await Promise.all([
    loadCaptured(() => listUploadBatches(employerId, upload.uploadId), []),
    batchId
      ? missingObjectFallback(getUploadBatch(employerId, upload.uploadId, batchId), null)
      : Promise.resolve(null),
  ]);
  return (
    <JobBatchesCard
      batches={batches.result}
      batchesScript={batches.script}
      employerId={employerId}
      errorClass={errorClass}
      selectedBatch={selectedBatch}
      selectedSection={selectedSection}
      upload={upload}
    />
  );
}

export async function UploadStagingSlot({
  employerId,
  upload,
  errorClass,
  selectedSection,
}: {
  employerId: number;
  upload: UploadDetail;
  errorClass: UploadErrorClass;
  selectedSection: UploadSectionRollup | null;
}): Promise<React.JSX.Element> {
  const [staging, finalize] = await Promise.all([
    loadCaptured(() => listCreationStaging(employerId, upload.uploadId), {
      stagingCount: 0,
      orphanCount: 0,
      orphans: [],
    }),
    missingObjectFallback(getCreationFinalize(employerId, upload.uploadId), null),
  ]);
  return (
    <JobStagingCard
      employerId={employerId}
      errorClass={errorClass}
      finalize={finalize}
      selectedSection={selectedSection}
      staging={staging.result}
      stagingScript={staging.script}
      upload={upload}
    />
  );
}

export async function UploadEmployeeSlot({
  employerId,
  upload,
  errorClass,
  selectedSection,
  employeeId,
  workEmail,
}: {
  employerId: number;
  upload: UploadDetail;
  errorClass: UploadErrorClass;
  selectedSection: UploadSectionRollup | null;
  employeeId: number | null;
  workEmail: string | null;
}): Promise<React.JSX.Element> {
  const [liveRow, stagingRow] = await Promise.all([
    employeeId || workEmail
      ? getUploadLiveRow(employerId, { employeeId, workEmail })
      : Promise.resolve(null),
    upload.type === "creation" && workEmail
      ? missingObjectFallback(getCreationStagingRow(employerId, upload.uploadId, workEmail), null)
      : Promise.resolve(null),
  ]);
  const employmentNumber = liveRow?.employmentNumber ?? null;
  const [employeeProfile, employeeAccess, employeeLogin, writesEnabled] = await Promise.all([
    employmentNumber
      ? getEmployeeProfile(employerId, employmentNumber)
      : Promise.resolve(null),
    employmentNumber
      ? getEmployeeAccess(employerId, employmentNumber)
      : Promise.resolve(null),
    employmentNumber
      ? captureQueryScript(() => getEmployeeLoginInfo(employerId, employmentNumber))
      : Promise.resolve(null),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);
  return (
    <JobEmployeeSlot
      employeeAccess={employeeAccess}
      employeeLogin={employeeLogin?.result.login ?? null}
      employeeLoginAttempts={employeeLogin?.result.attempts ?? []}
      employeeLoginScript={employeeLogin?.script ?? ""}
      employeeProfile={employeeProfile}
      employerId={employerId}
      errorClass={errorClass}
      liveRow={liveRow}
      selectedEmployeeId={employeeId}
      selectedSection={selectedSection}
      stagingRow={stagingRow}
      upload={upload}
      writesEnabled={writesEnabled}
    />
  );
}

async function loadRowErrors(
  errorClass: UploadErrorClass,
  employerId: number,
  uploadId: number,
  sectionId: number | null,
  catalogFields: UploadCatalogField[],
) {
  if (errorClass === "system") {
    return null;
  }
  return captureQueryScript(() =>
    listUploadRowErrors(employerId, uploadId, sectionId, errorClass, catalogFields),
  );
}

async function loadCaptured<T>(
  work: () => Promise<T>,
  fallback: T,
): Promise<{ result: T; script: string }> {
  try {
    return await captureQueryScript(work);
  } catch (error) {
    if (isMissingObjectError(error)) {
      return { result: fallback, script: "" };
    }
    throw error;
  }
}

async function missingObjectFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isMissingObjectError(error)) {
      return fallback;
    }
    throw error;
  }
}
