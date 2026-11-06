export const DELIVERY_STATUSES = [
  "Sent",
  "Queued",
  "Not Queued",
  "Poisoned",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export function parseDeliveryStatus(
  value: string | null | undefined,
): DeliveryStatus | null {
  if (value && (DELIVERY_STATUSES as readonly string[]).includes(value)) {
    return value as DeliveryStatus;
  }
  return null;
}

/**
 * Maps a TEmail join result onto SMTP delivery buckets.
 * Poisoned outbox rows (SentAttempts 7 or 9) stay separate from Queued.
 */
export function normalizeDeliveryStatus(input: {
  emailId: number | null | undefined;
  emailSent: number | boolean | null | undefined;
  sentAttempts: number | null | undefined;
}): DeliveryStatus {
  const sent =
    input.emailSent === true ||
    input.emailSent === 1 ||
    Number(input.emailSent) === 1;
  if (sent) {
    return "Sent";
  }
  if (input.emailId == null) {
    return "Not Queued";
  }
  const attempts =
    input.sentAttempts == null ? null : Number(input.sentAttempts);
  if (attempts === 7 || attempts === 9) {
    return "Poisoned";
  }
  return "Queued";
}
