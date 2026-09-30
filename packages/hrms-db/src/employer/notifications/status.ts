export const EMAIL_PAGE_SIZE = 50;
export const INBOX_PAGE_SIZE = 50;

export type InboxSide = "for" | "by";

export const EMAIL_MODULES = [
  "core",
  "training",
  "resource-allocation",
  "survey",
  "travel",
] as const;

export type EmailModuleKey = (typeof EMAIL_MODULES)[number];

export const EMAIL_MODULE_LABELS: Record<EmailModuleKey, string> = {
  core: "Core",
  training: "Training",
  "resource-allocation": "Resource Allocation",
  survey: "Survey",
  travel: "Travel and Expense",
};

export const EMAIL_STATUSES = [
  "New",
  "Pending",
  "Failed",
  "Completed",
  "Other",
] as const;

export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export function parseEmailModuleKey(
  value: string | null | undefined,
): EmailModuleKey | null {
  if (value && (EMAIL_MODULES as readonly string[]).includes(value)) {
    return value as EmailModuleKey;
  }
  return null;
}

export function parseEmailStatus(
  value: string | null | undefined,
): EmailStatus | null {
  if (value && (EMAIL_STATUSES as readonly string[]).includes(value)) {
    return value as EmailStatus;
  }
  return null;
}

/**
 * Maps Core words and satellite char codes onto the Email Notification
 * Monitor labels. Unmapped values, including an empty status, are Other.
 */
export function normalizeEmailStatus(
  value: string | null | undefined,
): EmailStatus {
  switch ((value ?? "").trim().toUpperCase()) {
    case "N":
    case "NEW":
      return "New";
    case "P":
    case "PENDING":
      return "Pending";
    case "F":
    case "FAILED":
      return "Failed";
    case "C":
    case "COMPLETED":
      return "Completed";
    default:
      return "Other";
  }
}
