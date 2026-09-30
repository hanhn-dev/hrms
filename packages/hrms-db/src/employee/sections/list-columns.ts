/**
 * Sections shown as count columns on the Employees search list.
 * Excludes Personal / Employment (always 1 when the employee exists).
 * Soft-delete filters match getEmployeeSectionCounts / Get SPs.
 * `tables` are optional. A missing table disables only that column.
 */
export const EMPLOYEE_LIST_SECTION_COLUMNS = [
  {
    sectionId: 2,
    field: "skillCount",
    countColumn: "SkillCount",
    label: "Skills",
    sqlAlias: "SkillCounts",
    tables: ["TEmployeeSkillDetails"],
  },
  {
    sectionId: 3,
    field: "domainCount",
    countColumn: "DomainCount",
    label: "Domains",
    sqlAlias: "DomainCounts",
    tables: ["TEmployeeDomainDetails"],
  },
  {
    sectionId: 4,
    field: "passportVisaCount",
    countColumn: "PassportVisaCount",
    label: "Passport & Visa",
    sqlAlias: "PassportVisaCounts",
    tables: ["TEmployeePassportDetails", "TEmployeeVisaInfo"],
  },
  {
    sectionId: 6,
    field: "pastEmploymentCount",
    countColumn: "PastEmploymentCount",
    label: "Past Employment",
    sqlAlias: "PastEmploymentCounts",
    tables: ["TPastEmploymentDetails"],
  },
  {
    sectionId: 7,
    field: "bankCount",
    countColumn: "BankCount",
    label: "Bank",
    sqlAlias: "BankCounts",
    tables: ["TEmployeeBankDetails"],
  },
  {
    sectionId: 8,
    field: "nominationCount",
    countColumn: "NominationCount",
    label: "Nomination",
    sqlAlias: "NominationCounts",
    tables: ["TEmployeeNomination"],
  },
  {
    sectionId: 9,
    field: "educationCount",
    countColumn: "EducationCount",
    label: "Education",
    sqlAlias: "EducationCounts",
    tables: ["TEducationDetails"],
  },
  {
    sectionId: 10,
    field: "familyCount",
    countColumn: "FamilyCount",
    label: "Family",
    sqlAlias: "FamilyCounts",
    tables: ["TEmployeeFamilyDetails"],
  },
  {
    sectionId: 17,
    field: "nomineeCount",
    countColumn: "NomineeCount",
    label: "Nominee",
    sqlAlias: "NomineeCounts",
    tables: ["TEmployeeNominee_Details"],
  },
  {
    sectionId: 11,
    field: "contactCount",
    countColumn: "ContactCount",
    label: "Contact",
    sqlAlias: "ContactCounts",
    tables: ["TEmployeeContactDetails"],
  },
  {
    sectionId: 12,
    field: "emergencyCount",
    countColumn: "EmergencyCount",
    label: "Emergency",
    sqlAlias: "EmergencyCounts",
    tables: ["TEmployeeEmergencyContactDetails"],
  },
  {
    sectionId: 13,
    field: "certificationCount",
    countColumn: "CertificationCount",
    label: "Certifications",
    sqlAlias: "CertificationCounts",
    tables: ["TCertificationDetails"],
  },
] as const;

export type EmployeeListSectionField =
  (typeof EMPLOYEE_LIST_SECTION_COLUMNS)[number]["field"];

export type EmployeeSectionCountFields = Record<EmployeeListSectionField, number | null>;

export type UnavailableSection = {
  feature: string;
  objectName: string;
  field: EmployeeListSectionField;
};

export function sectionCountTableNames(): string[] {
  return [
    ...new Set(
      EMPLOYEE_LIST_SECTION_COLUMNS.flatMap((column) => [...column.tables]),
    ),
  ];
}

/** Columns whose live table is absent. Each missing table is one entry. */
export function unavailableSectionCounts(
  present: ReadonlySet<string>,
): UnavailableSection[] {
  const unavailable: UnavailableSection[] = [];
  for (const column of EMPLOYEE_LIST_SECTION_COLUMNS) {
    for (const table of column.tables) {
      if (!present.has(table)) {
        unavailable.push({
          feature: column.label,
          objectName: `dbo.${table}`,
          field: column.field,
        });
      }
    }
  }
  return unavailable;
}
