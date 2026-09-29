import {
  parseUploadTypeKey,
  type UploadErrorClass,
  type UploadTypeKey,
} from "@hrms/db/uploads";

export type UploadsView = "catalog" | "jobs";

export const UPLOAD_STATUSES = [
  "Created",
  "Validating",
  "Validated",
  "Processing",
  "Processed",
  "Failed",
] as const;

export function parseUploadsView(value: string | undefined): UploadsView {
  return value === "catalog" ? "catalog" : "jobs";
}

export function parseUploadTypeParam(value: string | undefined): UploadTypeKey {
  return parseUploadTypeKey(value) ?? "profile";
}

export function parseOptionalUploadType(
  value: string | undefined,
): UploadTypeKey | null {
  return parseUploadTypeKey(value);
}

export function parseCountryIdParam(value: string | undefined): number {
  if (value == null || value === "") {
    return 0;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function parseOptionalPositiveInt(value: string | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseSectionIdParam(value: string | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function parseErrorClassParam(value: string | undefined): UploadErrorClass {
  if (value === "processing" || value === "system" || value === "validation") {
    return value;
  }
  return "validation";
}

export function uploadsHref(
  employerId: number,
  params: {
    view?: UploadsView;
    type?: UploadTypeKey | null;
    countryId?: number | null;
    sectionId?: number | null;
    status?: string | null;
    uploadId?: number | null;
  },
): string {
  const search = new URLSearchParams();
  if (params.view === "catalog") {
    search.set("view", "catalog");
  }
  if (params.type) {
    search.set("type", params.type);
  }
  if (params.countryId && params.countryId > 0) {
    search.set("countryId", String(params.countryId));
  }
  if (params.sectionId != null) {
    search.set("sectionId", String(params.sectionId));
  }
  if (params.status) {
    search.set("status", params.status);
  }
  if (params.uploadId) {
    search.set("uploadId", String(params.uploadId));
  }
  const query = search.toString();
  return `/features/employers/${employerId}/uploads${query ? `?${query}` : ""}`;
}

export function uploadDetailHref(
  employerId: number,
  uploadId: number,
  params: {
    section?: number | null;
    sectionId?: number | null;
    error?: UploadErrorClass | null;
    employeeId?: number | null;
    workEmail?: string | null;
    batchId?: number | null;
  } = {},
): string {
  const search = new URLSearchParams();
  if (params.section != null) {
    search.set("section", String(params.section));
  }
  if (params.sectionId != null) {
    search.set("sectionId", String(params.sectionId));
  }
  if (params.error) {
    search.set("error", params.error);
  }
  if (params.employeeId) {
    search.set("employeeId", String(params.employeeId));
  }
  if (params.workEmail) {
    search.set("workEmail", params.workEmail);
  }
  if (params.batchId) {
    search.set("batchId", String(params.batchId));
  }
  const query = search.toString();
  return `/features/employers/${employerId}/uploads/${uploadId}${query ? `?${query}` : ""}`;
}
