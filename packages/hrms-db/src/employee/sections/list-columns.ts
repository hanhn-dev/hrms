/**
 * Sections shown as count columns on the Employees search list.
 * Excludes Personal / Employment (always 1 when the employee exists).
 * Soft-delete filters match getEmployeeSectionCounts / Get SPs.
 */
export const EMPLOYEE_LIST_SECTION_COLUMNS = [
  {
    sectionId: 2,
    field: "skillCount",
    label: "Skills",
    sqlAlias: "SkillCounts",
  },
  {
    sectionId: 3,
    field: "domainCount",
    label: "Domains",
    sqlAlias: "DomainCounts",
  },
  {
    sectionId: 4,
    field: "passportVisaCount",
    label: "Passport & Visa",
    sqlAlias: "PassportVisaCounts",
  },
  {
    sectionId: 6,
    field: "pastEmploymentCount",
    label: "Past Employment",
    sqlAlias: "PastEmploymentCounts",
  },
  {
    sectionId: 7,
    field: "bankCount",
    label: "Bank",
    sqlAlias: "BankCounts",
  },
  {
    sectionId: 8,
    field: "nominationCount",
    label: "Nomination",
    sqlAlias: "NominationCounts",
  },
  {
    sectionId: 9,
    field: "educationCount",
    label: "Education",
    sqlAlias: "EducationCounts",
  },
  {
    sectionId: 10,
    field: "familyCount",
    label: "Family",
    sqlAlias: "FamilyCounts",
  },
  {
    sectionId: 17,
    field: "nomineeCount",
    label: "Nominee",
    sqlAlias: "NomineeCounts",
  },
  {
    sectionId: 11,
    field: "contactCount",
    label: "Contact",
    sqlAlias: "ContactCounts",
  },
  {
    sectionId: 12,
    field: "emergencyCount",
    label: "Emergency",
    sqlAlias: "EmergencyCounts",
  },
  {
    sectionId: 13,
    field: "certificationCount",
    label: "Certifications",
    sqlAlias: "CertificationCounts",
  },
] as const;

export type EmployeeListSectionField =
  (typeof EMPLOYEE_LIST_SECTION_COLUMNS)[number]["field"];

export type EmployeeSectionCountFields = Record<EmployeeListSectionField, number>;
