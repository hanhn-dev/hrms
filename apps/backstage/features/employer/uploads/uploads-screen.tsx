import { Suspense } from "react";
import {
  UploadsCatalogSlot,
  UploadsCountriesSlot,
  UploadsJobsSlot,
} from "@/features/employer/uploads/uploads-slots";
import { UploadsPanel } from "@/features/employer/uploads/uploads-panel";
import type { UploadsView } from "@/features/employer/uploads/uploads-source";
import type { UploadTypeKey } from "@hrms/db";
import { SectionFallback } from "@/shared/ui/section-fallback";

export function UploadsScreen({
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
}): React.JSX.Element {
  return (
    <UploadsPanel
      countryId={countryId}
      countrySelect={
        view === "catalog" ? (
          <Suspense fallback={<SectionFallback title="Countries" />}>
            <UploadsCountriesSlot
              countryId={countryId}
              employerId={employerId}
              sectionId={sectionId}
              type={type}
            />
          </Suspense>
        ) : null
      }
      employerId={employerId}
      jobStatus={jobStatus}
      jobType={jobType}
      jobUploadId={jobUploadId}
      sectionId={sectionId}
      type={type}
      view={view}
    >
      {view === "jobs" ? (
        <Suspense fallback={<SectionFallback title="Uploads" />}>
          <UploadsJobsSlot
            employerId={employerId}
            jobStatus={jobStatus}
            jobType={jobType}
            jobUploadId={jobUploadId}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<SectionFallback title="Type catalog" />}>
          <UploadsCatalogSlot
            countryId={countryId}
            employerId={employerId}
            sectionId={sectionId}
            type={type}
          />
        </Suspense>
      )}
    </UploadsPanel>
  );
}
