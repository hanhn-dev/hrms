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
