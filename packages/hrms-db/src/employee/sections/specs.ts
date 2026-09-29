export type SectionCountSpec = {
  sectionId: number;
  sectionName: string;
  label: string;
  /** How the live count is derived (for docs / tests). */
  source:
    | "employee-presence"
    | "skill"
    | "domain"
    | "passport-visa"
    | "past-employment"
    | "bank"
    | "nomination"
    | "education"
    | "family"
    | "nominee"
    | "contact"
    | "emergency"
    | "certification";
};

/**
 * Countable My Details sections in HISTORY_SECTIONS order.
 * Active filters mirror SP_EMPMD_Get* / SP_CM_GetAllCertificationDet / SP_Mydetails_GetNomineeDetails.
 */
export const SECTION_COUNT_SPECS: readonly SectionCountSpec[] = [
  {
    sectionId: 1,
    sectionName: "Personal Details",
    label: "Personal Details",
    source: "employee-presence",
  },
  {
    sectionId: 2,
    sectionName: "Skill Details",
    label: "Skill",
    source: "skill",
  },
  {
    sectionId: 3,
    sectionName: "Domain Details",
    label: "Domain Information",
    source: "domain",
  },
  {
    sectionId: 4,
    sectionName: "Passport Details",
    label: "Passport & Visa Details",
    source: "passport-visa",
  },
  {
    sectionId: 6,
    sectionName: "Past Employment Details",
    label: "Past Employment",
    source: "past-employment",
  },
  {
    sectionId: 7,
    sectionName: "Bank Details",
    label: "Bank Details",
    source: "bank",
  },
  {
    sectionId: 8,
    sectionName: "Nomination Details",
    label: "Nomination Details",
    source: "nomination",
  },
  {
    sectionId: 9,
    sectionName: "Education Details",
    label: "Education Details",
    source: "education",
  },
  {
    sectionId: 10,
    sectionName: "Family Details",
    label: "Family Details",
    source: "family",
  },
  {
    sectionId: 17,
    sectionName: "Nominee Details",
    label: "Nominee Details",
    source: "nominee",
  },
  {
    sectionId: 11,
    sectionName: "Contact Details",
    label: "Contact Details",
    source: "contact",
  },
  {
    sectionId: 12,
    sectionName: "Emergency Contact Details",
    label: "Emergency Contacts",
    source: "emergency",
  },
  {
    sectionId: 13,
    sectionName: "Certification Details",
    label: "Certifications",
    source: "certification",
  },
  {
    sectionId: 14,
    sectionName: "Current Employment Details",
    label: "Employment Details",
    source: "employee-presence",
  },
] as const;
