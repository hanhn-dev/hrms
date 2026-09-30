export const UPLOAD_TYPE_KEYS = ["creation", "profile", "image"] as const;
export type UploadTypeKey = (typeof UPLOAD_TYPE_KEYS)[number];

export const UPLOAD_TYPE_DB = {
  creation: "BulkCreation",
  profile: "BulkProfileUpdate",
  image: "BulkImageUpdate",
} as const;

export const UPLOAD_TYPE_LABELS = {
  creation: "Bulk Employee Creation",
  profile: "Bulk Profile Update",
  image: "Bulk Image Upload",
} as const;

export const UPLOAD_ERROR_CLASSES = [
  "validation",
  "processing",
  "system",
] as const;
export type UploadErrorClass = (typeof UPLOAD_ERROR_CLASSES)[number];

export const STUCK_AFTER_HOURS = 3;
export const EXPIRED_AFTER_DAYS = 7;

export type UploadHeaderMismatch = {
  sectionId: number | null;
  matched: string[];
  missingInCatalog: string[];
  extraInFile: string[];
};

export function parseUploadTypeKey(
  value: string | null | undefined,
): UploadTypeKey | null {
  if (value === "creation" || value === "profile" || value === "image") {
    return value;
  }
  if (value === UPLOAD_TYPE_DB.creation) {
    return "creation";
  }
  if (value === UPLOAD_TYPE_DB.profile) {
    return "profile";
  }
  if (value === UPLOAD_TYPE_DB.image) {
    return "image";
  }
  return null;
}

export function validationRuleNames(json: string | null | undefined): string[] {
  if (!json || json.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const names: string[] = [];
    for (const item of parsed) {
      if (item == null || typeof item !== "object" || Array.isArray(item)) {
        continue;
      }
      const rule = (item as { rule?: unknown }).rule;
      if (typeof rule === "string" && rule.trim() !== "") {
        names.push(rule.trim());
      }
    }
    return names;
  } catch {
    return [];
  }
}

export function splitFieldsCsv(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

export function compareUploadHeaders(
  uploadedCsv: string | null | undefined,
  catalogDisplayTexts: Array<string | null | undefined>,
): UploadHeaderMismatch {
  const fileHeaders = splitFieldsCsv(uploadedCsv);
  const catalogHeaders = catalogDisplayTexts
    .map((text) => text?.trim() ?? "")
    .filter((text) => text !== "");
  const catalogLookup = new Map(
    catalogHeaders.map((header) => [header.toLowerCase(), header]),
  );
  const fileLookup = new Map(
    fileHeaders.map((header) => [header.toLowerCase(), header]),
  );

  const matched: string[] = [];
  const extraInFile: string[] = [];
  for (const header of fileHeaders) {
    if (catalogLookup.has(header.toLowerCase())) {
      matched.push(header);
    } else {
      extraInFile.push(header);
    }
  }

  const missingInCatalog: string[] = [];
  for (const header of catalogHeaders) {
    if (!fileLookup.has(header.toLowerCase())) {
      missingInCatalog.push(header);
    }
  }

  return {
    sectionId: null,
    matched,
    missingInCatalog,
    extraInFile,
  };
}

export function isStuckStatus(
  status: string | null | undefined,
  updatedDate: Date | null | undefined,
  createdDate: Date | null | undefined,
  now = Date.now(),
): boolean {
  if (status !== "Validating" && status !== "Processing") {
    return false;
  }
  const at = updatedDate ?? createdDate;
  if (!at) {
    return true;
  }
  return now - at.getTime() > STUCK_AFTER_HOURS * 60 * 60 * 1000;
}

const EXPIRED_STATUSES = new Set(["Created", "Validating", "Validated"]);

export function isExpiredUpload(
  status: string | null | undefined,
  createdDate: Date | null | undefined,
  now = Date.now(),
): boolean {
  if (!status || !EXPIRED_STATUSES.has(status) || !createdDate) {
    return false;
  }
  return now - createdDate.getTime() > EXPIRED_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

export function ageHours(
  createdDate: Date | null | undefined,
  now = Date.now(),
): number | null {
  if (!createdDate) {
    return null;
  }
  return Math.max(0, (now - createdDate.getTime()) / (60 * 60 * 1000));
}

export function truncateText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (value == null) {
    return null;
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}…`;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    const single = asString(value);
    return single ? [single] : [];
  }
  return value
    .map((item) => asString(item))
    .filter((item): item is string => item != null);
}

export type ParsedUploadRow = {
  employeeId: number | null;
  workEmail: string | null;
  employmentNumber: string | null;
  employeeName: string | null;
  isValid: boolean | null;
  isProcessed: boolean | null;
  errorFields: Array<{ fieldName: string | null; message: string }>;
  unprocessedReasons: string[];
};

export function parseSectionRows(json: string | null | undefined): {
  rows: ParsedUploadRow[];
  parseError: string | null;
} {
  if (!json || json.trim() === "") {
    return { rows: [], parseError: null };
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return {
      rows: items
        .map((item) => parseSectionRow(item))
        .filter((row): row is ParsedUploadRow => row != null),
      parseError: null,
    };
  } catch {
    return { rows: [], parseError: "Section_JSON is not valid JSON." };
  }
}

function parseSectionRow(value: unknown): ParsedUploadRow | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const rawErrorFields = lookupRowValue(row, ["errorFields"]);
  const errorFields = uniqueErrorFields([
    ...(Array.isArray(rawErrorFields)
      ? rawErrorFields.flatMap((item) => parseErrorFieldItem(item))
      : []),
    ...parseErrorMessageValue(lookupRowValue(row, ["errorMessage"])),
  ]);

  return {
    employeeId: asNumber(row.ID ?? row.Id ?? row.EmployeeId ?? row.EmployeeID),
    workEmail: asString(row["Work Email"] ?? row.WorkEmail ?? row.EmailID),
    employmentNumber: asString(
      row["Employment Number"] ?? row.EmploymentNumber,
    ),
    employeeName: asString(row["Employee Name"] ?? row.EmployeeName),
    isValid: typeof row.isValid === "boolean" ? row.isValid : null,
    isProcessed: typeof row.isProcessed === "boolean" ? row.isProcessed : null,
    errorFields,
    unprocessedReasons: asStringList(row.unprocessedReasons),
  };
}

export type ParsedSectionDataRow = {
  rowIndex: number;
  values: Record<string, string | null>;
  employeeId: number | null;
  workEmail: string | null;
  isValid: boolean | null;
  isProcessed: boolean | null;
  errors: string[];
  errorSummary: string | null;
};

export function parseSectionDataRows(
  json: string | null | undefined,
  fields: string[],
): { rows: ParsedSectionDataRow[]; parseError: string | null } {
  if (!json || json.trim() === "") {
    return { rows: [], parseError: null };
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return {
      rows: items.flatMap((item, rowIndex) => {
        const row = asRecord(item);
        if (!row) {
          return [];
        }
        const lookup = new Map<string, unknown>();
        for (const [key, value] of Object.entries(row)) {
          lookup.set(key.trim().toLowerCase(), value);
        }
        const values: Record<string, string | null> = {};
        for (const field of fields) {
          values[field] = asString(lookup.get(field.trim().toLowerCase()));
        }
        const parsedRow = parseSectionRow(row);
        const errors = [
          ...(parsedRow?.errorFields.map((field) =>
            field.fieldName ? `${field.fieldName}: ${field.message}` : field.message,
          ) ?? []),
          ...(parsedRow?.unprocessedReasons ?? []),
        ];
        if (errors.length === 0 && parsedRow?.isValid === false) {
          errors.push(
            "This row is marked invalid (isValid=false), but Section_JSON has no errorFields or errorMessage text.",
          );
        }
        return [
          {
            rowIndex,
            values,
            employeeId: parsedRow?.employeeId ?? null,
            workEmail: parsedRow?.workEmail ?? null,
            isValid: parsedRow?.isValid ?? null,
            isProcessed: parsedRow?.isProcessed ?? null,
            errors,
            errorSummary: errors.join(" · ") || null,
          },
        ];
      }),
      parseError: null,
    };
  } catch {
    return { rows: [], parseError: "Section_JSON is not valid JSON." };
  }
}

export function creationExcludedFieldNames(settings: {
  isGradeEnable: boolean;
  isShowShiftRoaster: boolean;
}): string[] {
  const names = [
    "id",
    "employee name",
    "profile picture",
    "reviewmanager",
    "effectivedate",
    "employment number",
  ];
  if (settings.isGradeEnable) {
    names.push("grade");
  }
  if (!settings.isShowShiftRoaster) {
    names.push("shiftgroup");
  }
  return names;
}

function parseErrorMessageValue(
  value: unknown,
): Array<{ fieldName: string | null; message: string }> {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseErrorFieldItem(item));
  }
  return parseErrorFieldItem(value);
}

function parseErrorFieldItem(
  item: unknown,
): Array<{ fieldName: string | null; message: string }> {
  if (typeof item === "string" || typeof item === "number") {
    const message = asString(item);
    return message ? [{ fieldName: null, message }] : [];
  }
  const field = asRecord(item);
  if (!field) {
    return [];
  }
  const fieldName = asString(field.fieldName) ?? asString(field.FieldName);
  const messages = uniqueStrings([
    ...asStringList(field.errors),
    ...asStringList(field.message),
    ...asStringList(field.errorMessage),
  ]);
  if (messages.length === 0) {
    return fieldName
      ? [
          {
            fieldName,
            message: "Failed validation (no errorMessage stored).",
          },
        ]
      : [];
  }
  return messages.map((message) => ({ fieldName, message }));
}

function lookupRowValue(
  row: Record<string, unknown>,
  names: string[],
): unknown {
  const lookup = new Map(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]),
  );
  for (const name of names) {
    if (lookup.has(name.toLowerCase())) {
      return lookup.get(name.toLowerCase());
    }
  }
  return undefined;
}

function uniqueErrorFields(
  items: Array<{ fieldName: string | null; message: string }>,
): Array<{ fieldName: string | null; message: string }> {
  const seen = new Set<string>();
  const unique: Array<{ fieldName: string | null; message: string }> = [];
  for (const item of items) {
    const key = `${item.fieldName ?? ""}|${item.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim() !== ""))];
}

function errorMessages(error: unknown): string[] {
  const messages = [error instanceof Error ? error.message : String(error)];
  if (error && typeof error === "object" && "cause" in error) {
    const cause = error.cause;
    messages.push(cause instanceof Error ? cause.message : String(cause ?? ""));
  }
  return messages;
}

const MISSING_OBJECT_NAME = /Invalid object name '([^']+)'/i;

export function missingObjectName(error: unknown): string | null {
  for (const message of errorMessages(error)) {
    const match = MISSING_OBJECT_NAME.exec(message);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export function isMissingObjectError(error: unknown): boolean {
  return errorMessages(error).some((message) => /Invalid object name/i.test(message));
}
