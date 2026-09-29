"use client";

import { Alert, Select, Steps, Tabs } from "antd";
import { useRouter } from "next/navigation";
import { CatalogPanel } from "@/features/employer/uploads/catalog-panel";
import { JobsTable } from "@/features/employer/uploads/jobs-table";
import { uploadsHref, type UploadsView } from "@/features/employer/uploads/uploads-source";
import type {
  UploadCatalog,
  UploadCountryOption,
  UploadListItem,
  UploadTypeKey,
} from "@/features/employer/uploads/queries";
import { UPLOAD_TYPE_KEYS, UPLOAD_TYPE_LABELS } from "@hrms/db/uploads";

export function UploadsPanel({
  employerId,
  view,
  type,
  countryId,
  sectionId,
  jobType,
  jobStatus,
  jobUploadId,
  countries,
  catalog,
  jobs,
}: {
  employerId: number;
  view: UploadsView;
  type: UploadTypeKey;
  countryId: number;
  sectionId: number | null;
  jobType: UploadTypeKey | null;
  jobStatus: string | null;
  jobUploadId: number | null;
  countries: UploadCountryOption[];
  catalog: UploadCatalog | null;
  jobs: UploadListItem[] | null;
}): React.JSX.Element {
  const router = useRouter();

  return (
    <Tabs
      activeKey={view}
      destroyOnHidden
      onChange={(next) => {
        router.push(
          uploadsHref(employerId, {
            view: next === "catalog" ? "catalog" : "jobs",
            type: next === "catalog" ? type : jobType,
            countryId,
            sectionId: next === "catalog" ? sectionId : null,
            status: next === "catalog" ? null : jobStatus,
            uploadId: next === "catalog" ? null : jobUploadId,
          }),
        );
      }}
      items={[
        {
          key: "jobs",
          label: "Uploads",
          children: (
            <>
              <Tabs
                className="mb-2"
                activeKey={jobType ?? "all"}
                onChange={(next) => {
                  router.push(
                    uploadsHref(employerId, {
                      type: next === "all" ? null : (next as UploadTypeKey),
                      status: jobStatus,
                      uploadId: jobUploadId,
                    }),
                  );
                }}
                items={[
                  { key: "all", label: "All" },
                  ...UPLOAD_TYPE_KEYS.map((key) => ({
                    key,
                    label: UPLOAD_TYPE_LABELS[key],
                  })),
                ]}
              />
              <JobsTable
                employerId={employerId}
                jobs={jobs ?? []}
                type={jobType}
                status={jobStatus}
                uploadId={jobUploadId}
              />
            </>
          ),
        },
        {
          key: "catalog",
          label: "Type catalog",
          children: (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Select
                  className="min-w-64"
                  value={type}
                  options={UPLOAD_TYPE_KEYS.map((key) => ({
                    label: UPLOAD_TYPE_LABELS[key],
                    value: key,
                  }))}
                  onChange={(next: UploadTypeKey) => {
                    router.push(
                      uploadsHref(employerId, {
                        view: "catalog",
                        type: next,
                        countryId,
                      }),
                    );
                  }}
                />
                <Select
                  allowClear
                  className="min-w-56"
                  placeholder="Country (0 = all-country fields)"
                  value={countryId > 0 ? countryId : undefined}
                  options={countries.map((country) => ({
                    label: `${country.countryName} (${country.countryId})`,
                    value: country.countryId,
                  }))}
                  onChange={(next: number | undefined) => {
                    router.push(
                      uploadsHref(employerId, {
                        view: "catalog",
                        type,
                        countryId: next ?? 0,
                        sectionId,
                      }),
                    );
                  }}
                />
              </div>
              {catalog ? (
                <>
                  <Steps
                    className="mb-4"
                    size="small"
                    current={-1}
                    items={catalog.pipeline.map((title) => ({ title }))}
                  />
                  {catalog.notes.map((note) => (
                    <Alert key={note} className="mb-3" showIcon type="info" title={note} />
                  ))}
                  <CatalogPanel
                    catalog={catalog}
                    employerId={employerId}
                    selectedSectionId={sectionId}
                  />
                </>
              ) : (
                <Alert
                  showIcon
                  type="info"
                  title="Select an upload type to inspect its sections and fields."
                />
              )}
            </>
          ),
        },
      ]}
    />
  );
}
