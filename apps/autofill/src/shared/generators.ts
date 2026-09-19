import type { FieldKind } from "./messaging";

const WORDS = [
  "Acme",
  "Globex",
  "Initech",
  "Umbrella",
  "Stark",
  "Wayne",
  "Oscorp",
  "Hooli",
  "Pied",
  "Piper",
  "Soylent",
  "Massive",
  "Dynamic",
  "Apex",
  "Nimbus",
  "Vertex",
];

const ROLES = [
  "Engineer",
  "Analyst",
  "Manager",
  "Lead",
  "Consultant",
  "Specialist",
  "Coordinator",
  "Architect",
];

const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Operations",
  "Sales",
  "Marketing",
  "Product",
  "Support",
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function trimToMax(value: string, maxLength: number | null | undefined): string {
  if (maxLength == null || maxLength <= 0) {
    return value;
  }
  return value.slice(0, maxLength);
}

function normalizeLabel(label: string): string {
  return label.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Indian IFSC: 4 letters + '0' + 6 alphanumeric. */
export const IFSC_CODE_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

const IFSC_BANK_CODES = ["SBIN", "HDFC", "ICIC", "AXIS", "KKBK", "PUNB"];

export function isIfscLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  return /\bifsc\b/.test(normalized) || normalized.includes("bank identifier");
}

export function isIfscCode(value: string): boolean {
  return IFSC_CODE_PATTERN.test(value.trim());
}

function generateIfsc(): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const branch = Array.from({ length: 6 }, () => pick(alphabet.split(""))).join(
    "",
  );
  return `${pick(IFSC_BANK_CODES)}0${branch}`;
}

export interface GenerateOptions {
  label: string;
  kind: FieldKind;
  maxLength?: number | null;
  /** When true, return a deliberately invalid value for validation UI testing. */
  invalid?: boolean;
}

/** Produce a coherent random value for a discovered form field. */
export function generateValue(options: GenerateOptions): string {
  const { label, kind, maxLength, invalid = false } = options;
  const normalized = normalizeLabel(label);

  if (invalid) {
    return generateInvalidValue({ label: normalized, kind, maxLength });
  }

  if (kind === "email" || normalized.includes("email")) {
    return trimToMax(`user${randomInt(1000, 9999)}@example.com`, maxLength);
  }

  if (kind === "phone" || /mobile|phone|tel/.test(normalized)) {
    return trimToMax(String(randomInt(6000000000, 9999999999)), maxLength);
  }

  if (kind === "date" || normalized === "from" || normalized === "to") {
    return formatDate(randomPastDate(normalized === "to" ? 1 : 3));
  }

  if (
    kind === "number" ||
    /salary|ctc|people reporting|headcount|amount/.test(normalized)
  ) {
    if (/monthly/.test(normalized)) {
      return String(randomInt(50_000, 200_000));
    }
    return String(randomInt(600_000, 2_400_000));
  }

  if (/currency/.test(normalized)) {
    return pick(["INR", "USD", "EUR", "GBP"]);
  }

  if (isIfscLabel(label)) {
    return trimToMax(generateIfsc(), maxLength ?? 11);
  }

  if (/company/.test(normalized)) {
    return trimToMax(`${pick(WORDS)} ${pick(["Corp", "Ltd", "Inc", "Pvt Ltd"])}`, maxLength);
  }

  if (/role|designation|title/.test(normalized)) {
    return trimToMax(`${pick(ROLES)}`, maxLength);
  }

  if (/department/.test(normalized)) {
    return trimToMax(pick(DEPARTMENTS), maxLength);
  }

  if (/address/.test(normalized)) {
    return trimToMax(
      `${randomInt(1, 999)} ${pick(WORDS)} Street, ${pick(["Bengaluru", "Hyderabad", "Pune", "Chennai"])}`,
      maxLength,
    );
  }

  if (/key experience|experience|break/.test(normalized)) {
    return trimToMax(
      `Worked on ${pick(WORDS)} platforms delivering scalable features across ${pick(DEPARTMENTS).toLowerCase()} initiatives.`,
      maxLength,
    );
  }

  if (/reason.*leav/.test(normalized)) {
    return trimToMax(
      pick([
        "Career growth",
        "Relocation",
        "Better opportunity",
        "Personal reasons",
      ]),
      maxLength,
    );
  }

  if (/contact person name|contact name/.test(normalized)) {
    return trimToMax(`${pick(WORDS)} ${pick(ROLES)}`, maxLength);
  }

  if (kind === "textarea") {
    return trimToMax(
      `Sample notes for ${label || "field"} generated for autofill testing.`,
      maxLength,
    );
  }

  return trimToMax(`${pick(WORDS)} ${pick(ROLES)}`, maxLength);
}

export function generateInvalidValue(options: {
  label: string;
  kind: FieldKind;
  maxLength?: number | null;
}): string {
  const { label, kind, maxLength } = options;
  const normalized = normalizeLabel(label);

  if (kind === "email" || normalized.includes("email")) {
    return trimToMax("not-an-email", maxLength);
  }
  if (kind === "phone" || /mobile|phone|tel/.test(normalized)) {
    return trimToMax("abc", maxLength);
  }
  if (kind === "number" || /salary|ctc|people reporting/.test(normalized)) {
    return trimToMax("not-a-number", maxLength);
  }
  if (kind === "date" || normalized === "from" || normalized === "to") {
    return trimToMax("99-Xxx-9999", maxLength);
  }
  if (isIfscLabel(label)) {
    return trimToMax("NOTANIFSC", maxLength);
  }
  // Empty-ish invalid for required text fields
  return "";
}

function randomPastDate(yearsAgoMin: number): Date {
  const now = new Date();
  const year = now.getFullYear() - randomInt(yearsAgoMin, yearsAgoMin + 5);
  const month = randomInt(0, 11);
  const day = randomInt(1, 28);
  return new Date(year, month, day);
}

/** Format as DD-MMM-YYYY (common DatePicker display format). */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()]!;
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Build a coherent From/To pair where To is after From.
 * Used when filling both date fields in one pass.
 */
export function generateDateRange(): { from: string; to: string } {
  const from = randomPastDate(3);
  const to = new Date(from);
  to.setMonth(to.getMonth() + randomInt(6, 36));
  if (to > new Date()) {
    to.setTime(Date.now() - 86_400_000);
  }
  return { from: formatDate(from), to: formatDate(to) };
}
