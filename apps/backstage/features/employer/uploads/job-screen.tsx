import { Suspense } from "react";
import { Alert } from "antd";
import { captureQueryScript } from "@hrms/db";
import { JobSummary } from "@/features/employer/uploads/job-panel";
import { resolveUploadSelection } from "@/features/employer/uploads/job-selection";
import {
  UploadBatchesSlot,
  UploadEmployeeSlot,
  UploadRowErrorsSlot,
  UploadSectionDataSlot,
  UploadSectionsSlot,
  UploadStagingSlot,
} from "@/features/employer/uploads/job-slots";
import { getUpload } from "@/features/employer/uploads/queries";
import type { UploadErrorClass } from "@/features/employer/uploads/queries";
import { SectionFallback } from "@/shared/ui/section-fallback";

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
  const uploadLoaded = await captureQueryScript(() => getUpload(employerId, uploadId));
  const upload = uploadLoaded.result;
  if (!upload) {
    return <Alert showIcon type="error" title="Upload was not found for this employer." />;
  }

  const resolved = resolveUploadSelection({
    sections: upload.sections,
    uploadSectionId,
    sectionId,
    errorClass,
    invalid: upload.invalid,
    unprocessed: upload.unprocessed,
  });
  const selectedSection = resolved.section;

  return (
    <>
      <JobSummary employerId={employerId} upload={upload} />
      <Suspense fallback={<SectionFallback title={`Sections in this upload (${upload.sectionCount})`} />}>
        <UploadSectionsSlot
          employerId={employerId}
          errorClass={resolved.errorClass}
          sectionsScript={uploadLoaded.script}
          selectedSection={selectedSection}
          upload={upload}
        />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Section data" />}>
        <UploadSectionDataSlot
          employerId={employerId}
          errorClass={resolved.errorClass}
          selectedSection={selectedSection}
          upload={upload}
        />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Classified row errors" />}>
        <UploadRowErrorsSlot
          employerId={employerId}
          errorClass={resolved.errorClass}
          selectedSection={selectedSection}
          upload={upload}
        />
      </Suspense>
      {employeeId || workEmail ? (
        <Suspense fallback={<SectionFallback title="Selected row data" />}>
          <UploadEmployeeSlot
            employeeId={employeeId}
            employerId={employerId}
            errorClass={resolved.errorClass}
            selectedSection={selectedSection}
            upload={upload}
            workEmail={workEmail}
          />
        </Suspense>
      ) : null}
      <Suspense fallback={<SectionFallback title="Batches" />}>
        <UploadBatchesSlot
          batchId={batchId}
          employerId={employerId}
          errorClass={resolved.errorClass}
          selectedSection={selectedSection}
          upload={upload}
        />
      </Suspense>
      {upload.type === "creation" ? (
        <Suspense fallback={<SectionFallback title="Creation staging" />}>
          <UploadStagingSlot
            employerId={employerId}
            errorClass={resolved.errorClass}
            selectedSection={selectedSection}
            upload={upload}
          />
        </Suspense>
      ) : null}
    </>
  );
}
