import { cache, Suspense } from "react";
import { Alert } from "antd";
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
  JobSummary,
} from "@/features/employer/uploads/job-panel";
import { resolveUploadSelection } from "@/features/employer/uploads/job-selection";
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
  type UploadCatalogField,
  type UploadDetail,
  type UploadErrorClass,
  type UploadSectionRollup,
} from "@/features/employer/uploads/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { SectionFallback } from "@/shared/ui/section-fallback";

const loadCatalog = cache(
  (employerId: number, type: UploadTypeKey, countryId: number, sectionKey: string) =>
    listUploadCatalog(employerId, type, countryId, {
      sectionIds:
        sectionKey === ""
          ? []
          : sectionKey.split(",").map((value) => Number(value)),
    }),
);

function catalogSectionKey(upload: UploadDetail): string {
  return upload.sections
    .map((section) => section.sectionId)
    .filter((id): id is number => id != null)
    .join(",");
}

const loadUploadCapture = cache((employerId: number, uploadId: number) =>
  captureQueryScript(() => getUpload(employerId, uploadId)),
);

export type JobStreamQuery = {
  employerId: number;
  uploadId: number;
  uploadSectionId: number | null;
  sectionId: number | null;
  errorClass: UploadErrorClass;
  employeeId: number | null;
  workEmail: string | null;
  batchId: number | null;
  listPage: number;
  listSearch: string;
};

async function loadJob(input: JobStreamQuery) {
  const loaded = await loadUploadCapture(input.employerId, input.uploadId);
  const upload = loaded.result;
  if (!upload) {
    return null;
  }
  const resolved = resolveUploadSelection({
    sections: upload.sections,
    uploadSectionId: input.uploadSectionId,
    sectionId: input.sectionId,
    errorClass: input.errorClass,
    invalid: upload.invalid,
    unprocessed: upload.unprocessed,
  });
  return { loaded, upload, resolved };
}

export async function JobSummarySlot(input: JobStreamQuery): Promise<React.JSX.Element> {
  const job = await loadJob(input);
  if (!job) {
    return <Alert showIcon type="error" title="Upload was not found for this employer." />;
  }
  return (
    <>
      <JobSummary employerId={input.employerId} upload={job.upload} />
      {job.upload.type === "creation" ? (
        <Suspense fallback={<SectionFallback title="Creation staging" />}>
          <UploadStagingSlot
            employerId={input.employerId}
            errorClass={job.resolved.errorClass}
            listPage={input.listPage}
            listSearch={input.listSearch}
            selectedSection={job.resolved.section}
            upload={job.upload}
          />
        </Suspense>
      ) : null}
    </>
  );
}

export async function UploadSectionsStream(
  input: JobStreamQuery,
): Promise<React.JSX.Element | null> {
  const job = await loadJob(input);
  if (!job) {
    return null;
  }
  return (
    <UploadSectionsSlot
      employerId={input.employerId}
      errorClass={job.resolved.errorClass}
      sectionsScript={job.loaded.script}
      selectedSection={job.resolved.section}
      upload={job.upload}
    />
  );
}

export async function UploadSectionDataStream(
  input: JobStreamQuery,
): Promise<React.JSX.Element | null> {
  const job = await loadJob(input);
  if (!job) {
    return null;
  }
  return (
    <UploadSectionDataSlot
      employerId={input.employerId}
      errorClass={job.resolved.errorClass}
      selectedSection={job.resolved.section}
      upload={job.upload}
    />
  );
}

export async function UploadRowErrorsStream(
  input: JobStreamQuery,
): Promise<React.JSX.Element | null> {
  const job = await loadJob(input);
  if (!job) {
    return null;
  }
  return (
    <UploadRowErrorsSlot
      employerId={input.employerId}
      errorClass={job.resolved.errorClass}
      listPage={input.listPage}
      listSearch={input.listSearch}
      selectedSection={job.resolved.section}
      upload={job.upload}
    />
  );
}

export async function UploadEmployeeStream(
  input: JobStreamQuery,
): Promise<React.JSX.Element | null> {
  const job = await loadJob(input);
  if (!job) {
    return null;
  }
  return (
    <UploadEmployeeSlot
      employeeId={input.employeeId}
      employerId={input.employerId}
      errorClass={job.resolved.errorClass}
      selectedSection={job.resolved.section}
      upload={job.upload}
      workEmail={input.workEmail}
    />
  );
}

export async function UploadBatchesStream(
  input: JobStreamQuery,
): Promise<React.JSX.Element | null> {
  const job = await loadJob(input);
  if (!job) {
    return null;
  }
  return (
    <UploadBatchesSlot
      batchId={input.batchId}
      employerId={input.employerId}
      errorClass={job.resolved.errorClass}
      selectedSection={job.resolved.section}
      upload={job.upload}
    />
  );
}

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
      ? await loadCatalog(
        employerId,
        upload.type,
        upload.countryId ?? 0,
        catalogSectionKey(upload),
      )
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
  listPage,
  listSearch,
  selectedSection,
}: {
  employerId: number;
  upload: UploadDetail;
  errorClass: UploadErrorClass;
  listPage: number;
  listSearch: string;
  selectedSection: UploadSectionRollup | null;
}): Promise<React.JSX.Element> {
  const executionErrorsPromise = loadCaptured(
    () =>
      listUploadExecutionErrors(employerId, upload.uploadId, {
        page: listPage,
        q: listSearch,
      }),
    { rows: [], totalCount: 0, page: listPage, pageSize: 50 },
  );
  const catalog =
    upload.type != null
      ? await loadCatalog(
        employerId,
        upload.type,
        upload.countryId ?? 0,
        catalogSectionKey(upload),
      )
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
      executionErrors={executionErrors.result.rows}
      executionPage={executionErrors.result.page}
      executionPageSize={executionErrors.result.pageSize}
      executionSearch={listSearch}
      executionTotal={executionErrors.result.totalCount}
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
  listPage,
  listSearch,
  selectedSection,
}: {
  employerId: number;
  upload: UploadDetail;
  errorClass: UploadErrorClass;
  listPage: number;
  listSearch: string;
  selectedSection: UploadSectionRollup | null;
}): Promise<React.JSX.Element> {
  const [staging, finalize] = await Promise.all([
    loadCaptured(
      () =>
        listCreationStaging(employerId, upload.uploadId, {
          page: listPage,
          q: listSearch,
        }),
      {
        stagingCount: 0,
        orphanCount: 0,
        orphans: [],
        totalCount: 0,
        page: listPage,
        pageSize: 50,
      },
    ),
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
      stagingSearch={listSearch}
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
