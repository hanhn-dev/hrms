import { z } from "zod";

export const employerIdSchema = z.number().int().positive();
export const employeeIdSchema = z.number().int().positive();
export const userIdSchema = z.number().int().positive();
export const roleIdSchema = z.number().int().positive();
export const employmentNumberSchema = z.string().trim().min(1);
export const menuIdSchema = z.number().int().positive();
export const tabIdSchema = z.number().int().nonnegative();
export const fieldIdSchema = z.number().int().positive();
export const uploadIdSchema = z.number().int().positive();
export const workflowIdSchema = z.number().int().positive();
export const changeRequestIdSchema = z.number().int().positive();
export const modulePageIdSchema = z.number().int().positive();
export const moduleIdSchema = z.number().int().positive();

export function parseEmployerId(value: number): number {
  return employerIdSchema.parse(value);
}

export function parseEmploymentNumber(value: string): string {
  return employmentNumberSchema.parse(value);
}

export function parseUploadId(value: number): number {
  return uploadIdSchema.parse(value);
}

/**
 * Soft upper bound for sanity checks only. Role/user LocationIds and
 * BusinessUnitIds are VARCHAR(MAX) in SQL (70985_AlterRoles); do not use a
 * 500-char Prisma leftover as a hard limit — "select all" lists routinely
 * exceed that.
 */
export const LOCATION_BU_IDS_MAX_LENGTH = 100_000;

/**
 * Normalize a comma-separated ID list for storage.
 * Empty / whitespace → null (unrestricted). Rejects non-integers.
 */
export function normalizeCommaIdList(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  if (trimmed.length > LOCATION_BU_IDS_MAX_LENGTH) {
    throw new Error(
      `ID list must be at most ${LOCATION_BU_IDS_MAX_LENGTH} characters.`,
    );
  }
  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return null;
  }
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      throw new Error(`Invalid id "${part}" — use comma-separated integers only.`);
    }
  }
  return parts.join(",");
}

/** Parse a stored comma list into integer IDs (invalid tokens skipped). */
export function parseCommaIdList(raw: string | null | undefined): number[] {
  if (raw == null || raw.trim() === "") {
    return [];
  }
  const ids: number[] = [];
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (token === "" || !/^\d+$/.test(token)) {
      continue;
    }
    ids.push(Number(token));
  }
  return ids;
}

/**
 * Merge user + role Location/BU lists the same way as
 * FN_LocationBU_GetEmployeeDetails_Clone: empty user → role only; else user,role.
 */
export function mergeAccessIdLists(
  userList: string | null | undefined,
  roleList: string | null | undefined,
): string | null {
  const user = userList?.trim() ?? "";
  const role = roleList?.trim() ?? "";
  if (user === "") {
    return role === "" ? null : role;
  }
  if (role === "") {
    return user;
  }
  return `${user},${role}`;
}

/** True when an employee passes both Location and BU filters (empty = unrestricted). */
export function employeeMatchesLocationBuScope(input: {
  locationId: number | null;
  businessUnitId: number | null;
  locationIds: string | null | undefined;
  businessUnitIds: string | null | undefined;
}): boolean {
  const locationFilter = parseCommaIdList(input.locationIds);
  const buFilter = parseCommaIdList(input.businessUnitIds);
  if (locationFilter.length > 0) {
    if (
      input.locationId == null ||
      !locationFilter.includes(input.locationId)
    ) {
      return false;
    }
  }
  if (buFilter.length > 0) {
    if (
      input.businessUnitId == null ||
      !buFilter.includes(input.businessUnitId)
    ) {
      return false;
    }
  }
  return true;
}
