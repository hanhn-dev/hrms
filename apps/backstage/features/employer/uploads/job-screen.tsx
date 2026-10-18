import { Suspense } from "react";
import {
  JobSummarySlot,
  UploadBatchesStream,
  UploadEmployeeStream,
  UploadRowErrorsStream,
  UploadSectionDataStream,
  UploadSectionsStream,
} from "@/features/employer/uploads/job-slots";
import type { UploadErrorClass } from "@/features/employer/uploads/queries";
import { SectionFallback } from "@/shared/ui/section-fallback";

export function JobScreen({
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
}): React.JSX.Element {
  const query = {
    employerId,
    uploadId,
    uploadSectionId,
    sectionId,
    errorClass,
    employeeId,
    workEmail,
    batchId,
  };

  return (
    <>
      <Suspense fallback={<SectionFallback title="Upload" />}>
        <JobSummarySlot {...query} />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Sections in this upload" />}>
        <UploadSectionsStream {...query} />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Section data" />}>
        <UploadSectionDataStream {...query} />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Classified row errors" />}>
        <UploadRowErrorsStream {...query} />
      </Suspense>
      {employeeId || workEmail ? (
        <Suspense fallback={<SectionFallback title="Selected row data" />}>
          <UploadEmployeeStream {...query} />
        </Suspense>
      ) : null}
      <Suspense fallback={<SectionFallback title="Batches" />}>
        <UploadBatchesStream {...query} />
      </Suspense>
    </>
  );
}
