import { Alert } from "antd";
import { compareUploadHeaders } from "@hrms/db";
import { isMissingObjectError } from "@hrms/db/uploads";
import { getEmployeeAccess } from "@/features/employee/access/queries";
import { getEmployeeLoginInfo } from "@/features/employee/login/queries";
import { getEmployeeProfile } from "@/features/employee/profile/queries";
import { JobPanel } from "@/features/employer/uploads/job-panel";
import {
  getCreationFinalize,
  getCreationStagingRow,
  getUpload,
  getUploadBatch,
  getUploadLiveRow,
  listCreationStaging,
  listUploadBatches,
  listUploadCatalog,
  listUploadExecutionErrors,
  listUploadRowErrors,
  listUploadSectionData,
} from "@/features/employer/uploads/queries";
import type { UploadErrorClass } from "@/features/employer/uploads/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function JobScreen({
  employerId,
  uploadId,
  uploadSectionId,
  sectionId,
  errorClass,
  employeeId,
  workEmail,
  batchId,
}: {
  employerId: number;
  uploadId: number;
  uploadSectionId: number | null;
  sectionId: number | null;
  errorClass: UploadErrorClass;
  employeeId: number | null;
  workEmail: string | null;
  batchId: number | null;
}): Promise<React.JSX.Element> {
  const upload = await getUpload(employerId, uploadId);
  if (!upload) {
    return <Alert showIcon type="error" title="Upload was not found for this employer." />;
  }

  const selectedSection =
    upload.sections.find((section) => section.uploadSectionId === uploadSectionId) ??
    upload.sections.find((section) => section.sectionId === sectionId) ??
    upload.sections.find((section) => section.invalid > 0 || section.unprocessed > 0) ??
    upload.sections[0] ??
    null;
  const resolvedSectionId = selectedSection?.sectionId ?? null;
  const resolvedUploadSectionId = selectedSection?.uploadSectionId ?? null;
  const resolvedError =
    errorClass === "validation" && upload.invalid === 0 && upload.unprocessed > 0
      ? "processing"
      : errorClass;

  const catalog =
    upload.type != null
      ? await listUploadCatalog(employerId, upload.type, upload.countryId ?? 0)
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

  const catalogFieldsForSection =
    upload.type === "image"
      ? (catalog?.fields ?? [])
      : (catalog?.fields.filter((field) => field.sectionId === resolvedSectionId) ?? []);

  const [sectionData, rowErrors, batches, executionErrors, staging, finalize, selectedBatch, liveRow, stagingRow] =
    await Promise.all([
      listUploadSectionData(employerId, uploadId, resolvedUploadSectionId),
      resolvedError === "system"
        ? Promise.resolve(null)
        : listUploadRowErrors(
            employerId,
            uploadId,
            resolvedSectionId,
            resolvedError,
            catalogFieldsForSection,
          ),
      missingObjectFallback(listUploadBatches(employerId, uploadId), []),
      missingObjectFallback(listUploadExecutionErrors(employerId, uploadId), []),
      upload.type === "creation"
        ? missingObjectFallback(listCreationStaging(employerId, uploadId), {
            stagingCount: 0,
            orphanCount: 0,
            orphans: [],
          })
        : Promise.resolve(null),
      upload.type === "creation"
        ? missingObjectFallback(getCreationFinalize(employerId, uploadId), null)
        : Promise.resolve(null),
      batchId
        ? missingObjectFallback(getUploadBatch(employerId, uploadId, batchId), null)
        : Promise.resolve(null),
      employeeId || workEmail
        ? getUploadLiveRow(employerId, { employeeId, workEmail })
        : Promise.resolve(null),
      upload.type === "creation" && workEmail
        ? missingObjectFallback(getCreationStagingRow(employerId, uploadId, workEmail), null)
        : Promise.resolve(null),
    ]);

  const employmentNumber = liveRow?.employmentNumber ?? null;
  const [employeeProfile, employeeAccess, employeeLogin] = employmentNumber
    ? await Promise.all([
        getEmployeeProfile(employerId, employmentNumber),
        getEmployeeAccess(employerId, employmentNumber),
        getEmployeeLoginInfo(employerId, employmentNumber),
      ])
    : [null, null, null];
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  return (
    <JobPanel
      batches={batches}
      catalog={catalog}
      employerId={employerId}
      employeeAccess={employeeAccess}
      employeeLogin={employeeLogin?.login ?? null}
      employeeLoginAttempts={employeeLogin?.attempts ?? []}
      employeeProfile={employeeProfile}
      errorClass={resolvedError}
      executionErrors={executionErrors}
      finalize={finalize}
      liveRow={liveRow}
      mismatches={mismatches}
      rowErrors={rowErrors}
      selectedBatch={selectedBatch}
      sectionData={sectionData}
      selectedEmployeeId={employeeId}
      selectedSectionId={resolvedSectionId}
      selectedUploadSectionId={resolvedUploadSectionId}
      staging={staging}
      stagingRow={stagingRow}
      upload={upload}
      writesEnabled={writesEnabled}
    />
  );
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
