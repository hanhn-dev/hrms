export type HistorySectionDef = {
  name: string;
  label: string;
  sectionId: number;
};

/** Matches My Details `SECTIONS_WITH_HISTORY_CHANGES` (Visa folded into Passport). */
export const HISTORY_SECTIONS: readonly HistorySectionDef[] = [
  { name: "Personal Details", label: "Personal Details", sectionId: 1 },
  { name: "Skill Details", label: "Skill", sectionId: 2 },
  { name: "Domain Details", label: "Domain Information", sectionId: 3 },
  { name: "Passport Details", label: "Passport & Visa Details", sectionId: 4 },
  { name: "Past Employment Details", label: "Past Employment", sectionId: 6 },
  { name: "Bank Details", label: "Bank Details", sectionId: 7 },
  { name: "Nomination Details", label: "Nomination Details", sectionId: 8 },
  { name: "Education Details", label: "Education Details", sectionId: 9 },
  { name: "Family Details", label: "Family Details", sectionId: 10 },
  { name: "Nominee Details", label: "Nominee Details", sectionId: 17 },
  { name: "Contact Details", label: "Contact Details", sectionId: 11 },
  { name: "Emergency Contact Details", label: "Emergency Contacts", sectionId: 12 },
  { name: "Certification Details", label: "Certifications", sectionId: 13 },
  { name: "Current Employment Details", label: "Employment Details", sectionId: 14 },
] as const;

export const HISTORY_SECTION_NAMES = HISTORY_SECTIONS.map((s) => s.name);

export function isHistorySectionName(value: string): boolean {
  return HISTORY_SECTIONS.some((section) => section.name === value);
}

export function sectionIdForName(name: string): number | null {
  return HISTORY_SECTIONS.find((section) => section.name === name)?.sectionId ?? null;
}
