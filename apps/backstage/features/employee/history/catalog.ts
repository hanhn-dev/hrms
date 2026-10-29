export type HistoryViewFilter = "History" | "Future" | "Pending";

export const HISTORY_VIEW_LABELS: Record<HistoryViewFilter, string> = {
  History: "Past",
  Future: "Future",
  Pending: "Pending",
};

/** Client-safe section list (mirrors My Details SECTIONS_WITH_HISTORY_CHANGES). */
export const HISTORY_SECTIONS = [
  { name: "Personal Details", label: "Personal Details" },
  { name: "Skill Details", label: "Skill" },
  { name: "Domain Details", label: "Domain Information" },
  { name: "Passport Details", label: "Passport & Visa Details" },
  { name: "Past Employment Details", label: "Past Employment" },
  { name: "Bank Details", label: "Bank Details" },
  { name: "Nomination Details", label: "Nomination Details" },
  { name: "Education Details", label: "Education Details" },
  { name: "Family Details", label: "Family Details" },
  { name: "Nominee Details", label: "Nominee Details" },
  { name: "Contact Details", label: "Contact Details" },
  { name: "Emergency Contact Details", label: "Emergency Contacts" },
  { name: "Certification Details", label: "Certifications" },
  { name: "Current Employment Details", label: "Employment Details" },
] as const;

export const HISTORY_VIEW_OPTIONS: Array<{
  value: HistoryViewFilter;
  label: string;
}> = [
  { value: "History", label: HISTORY_VIEW_LABELS.History },
  { value: "Future", label: HISTORY_VIEW_LABELS.Future },
  { value: "Pending", label: HISTORY_VIEW_LABELS.Pending },
];

export const DEFAULT_HISTORY_LOOKBACK_DAYS = 90;

function utcDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveHistoryScreenFilters(input: {
  section?: string;
  from?: string;
  to?: string;
  now?: Date;
}): { section: string; from: string; to: string } {
  const section =
    input.section && HISTORY_SECTIONS.some((item) => item.name === input.section)
      ? input.section
      : HISTORY_SECTIONS[0].name;

  if (input.from || input.to) {
    return {
      section,
      from: input.from ?? "",
      to: input.to ?? "",
    };
  }

  const now = input.now ?? new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  from.setUTCDate(from.getUTCDate() - (DEFAULT_HISTORY_LOOKBACK_DAYS - 1));
  return { section, from: utcDateInput(from), to: utcDateInput(now) };
}
