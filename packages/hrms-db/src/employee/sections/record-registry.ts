/**
 * CRUD-capable registry for multi-record My Details sections.
 * Soft-delete / Show filters mirror Troubleshooter count SQL (counts.ts),
 * not HRMS Get SPs. Personal (1) and Employment (14) are intentionally omitted.
 */

export type SoftDeleteSpec =
  | {
      /** Active when column is NULL or 'N'; delete sets 'Y'. */
      kind: "yn";
      column: string;
    }
  | {
      /** Active when column is NULL or 0; delete sets 1. */
      kind: "bit-null-or-zero";
      column: string;
    }
  | {
      /** Active when column = 0 exactly; delete sets 1. */
      kind: "bit-zero";
      column: string;
    }
  | {
      /** Active when column IS NULL; delete sets 1. */
      kind: "bit-null";
      column: string;
    }
  | {
      /** Bank: ISNULL(Show,1)=1 AND ISNULL(IsDelete,0)=0; delete sets IsDelete=1. */
      kind: "bank";
    }
  | { kind: "none" };

export type SectionTableAudit = {
  updatedBy?: string;
  updatedAt?: string;
  updatedAtUtc?: string;
  createdBy?: string;
  createdAt?: string;
  createdAtUtc?: string;
};

export type SectionTableSpec = {
  liveTable: string;
  entityKeyColumn: string;
  employeeIdColumn: string;
  softDelete: SoftDeleteSpec;
  audit?: SectionTableAudit;
};

export type SectionRecordSpec = {
  sectionId: number;
  sectionName: string;
  label: string;
  tables: readonly SectionTableSpec[];
};

export const SECTION_RECORD_SPECS: readonly SectionRecordSpec[] = [
  {
    sectionId: 2,
    sectionName: "Skill Details",
    label: "Skill",
    tables: [
      {
        liveTable: "TEmployeeSkillDetails",
        entityKeyColumn: "SkillDetailsId",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "yn", column: "Isdeleted" },
        audit: {
          updatedBy: "LastUpdatedBy",
          updatedAt: "LastModifyOn",
          updatedAtUtc: "LastModifyOnUtcTime",
        },
      },
    ],
  },
  {
    sectionId: 3,
    sectionName: "Domain Details",
    label: "Domain Information",
    tables: [
      {
        liveTable: "TEmployeeDomainDetails",
        entityKeyColumn: "DomainDetailsId",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "yn", column: "Isdeleted" },
        audit: {
          updatedBy: "LastUpdatedBy",
          updatedAt: "LastModifyOn",
          updatedAtUtc: "LastModifyOnUtcTime",
        },
      },
    ],
  },
  {
    sectionId: 4,
    sectionName: "Passport Details",
    label: "Passport & Visa Details",
    tables: [
      {
        liveTable: "TEmployeePassportDetails",
        entityKeyColumn: "Id",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "none" },
        audit: {
          updatedBy: "LastUpdatedBy",
          updatedAt: "LastModifyOn",
          updatedAtUtc: "LastModifyOnUtcTime",
        },
      },
      {
        liveTable: "TEmployeeVisaInfo",
        entityKeyColumn: "VisaId",
        employeeIdColumn: "EmployeeID",
        softDelete: { kind: "yn", column: "Isdeleted" },
        audit: {
          updatedBy: "LastUpdatedBy",
          updatedAt: "LastModifyOn",
          updatedAtUtc: "LastModifyOnUtcTime",
        },
      },
    ],
  },
  {
    sectionId: 6,
    sectionName: "Past Employment Details",
    label: "Past Employment",
    tables: [
      {
        liveTable: "TPastEmploymentDetails",
        entityKeyColumn: "PastEmploymentId",
        employeeIdColumn: "EmployeeID",
        softDelete: { kind: "bit-null-or-zero", column: "IsDelete" },
        audit: {
          updatedBy: "ModifiedBy",
          updatedAtUtc: "ModifiedDateUtc",
        },
      },
    ],
  },
  {
    sectionId: 7,
    sectionName: "Bank Details",
    label: "Bank Details",
    tables: [
      {
        liveTable: "TEmployeeBankDetails",
        entityKeyColumn: "BankDetailId",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "bank" },
        audit: {
          updatedBy: "LastUpdatedBy",
          updatedAtUtc: "UpdatedDateUtc",
        },
      },
    ],
  },
  {
    sectionId: 8,
    sectionName: "Nomination Details",
    label: "Nomination Details",
    tables: [
      {
        liveTable: "TEmployeeNomination",
        entityKeyColumn: "EmployeeNominationId",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "bit-zero", column: "IsDelete" },
        audit: {
          updatedBy: "ModifiedBy",
          updatedAtUtc: "ModifiedDateUtc",
        },
      },
    ],
  },
  {
    sectionId: 9,
    sectionName: "Education Details",
    label: "Education Details",
    tables: [
      {
        liveTable: "TEducationDetails",
        entityKeyColumn: "EducationId",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "bit-null", column: "IsDelete" },
        audit: {
          updatedBy: "ModifiedBy",
          updatedAtUtc: "ModifiedDateUtc",
        },
      },
    ],
  },
  {
    sectionId: 10,
    sectionName: "Family Details",
    label: "Family Details",
    tables: [
      {
        liveTable: "TEmployeeFamilyDetails",
        entityKeyColumn: "EmployeeFamilyDetailID",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "bit-zero", column: "IsDelete" },
        audit: {
          updatedBy: "ModifiedBy",
          updatedAtUtc: "ModifiedDateUtc",
        },
      },
    ],
  },
  {
    sectionId: 17,
    sectionName: "Nominee Details",
    label: "Nominee Details",
    tables: [
      {
        liveTable: "TEmployeeNominee_Details",
        entityKeyColumn: "NomineeDetailId",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "bit-null-or-zero", column: "IsDelete" },
        audit: {
          updatedBy: "ModifiedBy",
          updatedAtUtc: "ModifiedDateUtc",
        },
      },
    ],
  },
  {
    sectionId: 11,
    sectionName: "Contact Details",
    label: "Contact Details",
    tables: [
      {
        liveTable: "TEmployeeContactDetails",
        entityKeyColumn: "EmployeeContactDetailID",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "none" },
        audit: {
          updatedBy: "ModifiedBy",
          updatedAtUtc: "ModifiedDateUtc",
        },
      },
    ],
  },
  {
    sectionId: 12,
    sectionName: "Emergency Contact Details",
    label: "Emergency Contacts",
    tables: [
      {
        liveTable: "TEmployeeEmergencyContactDetails",
        entityKeyColumn: "EmergencyContactID",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "yn", column: "Isdeleted" },
        audit: {
          updatedBy: "ModifiedBy",
          updatedAtUtc: "ModifiedDateUtc",
        },
      },
    ],
  },
  {
    sectionId: 13,
    sectionName: "Certification Details",
    label: "Certifications",
    tables: [
      {
        liveTable: "TCertificationDetails",
        entityKeyColumn: "CertificationDetailId",
        employeeIdColumn: "EmployeeId",
        softDelete: { kind: "bit-null", column: "IsDelete" },
        audit: {
          updatedBy: "ModifiedBy",
          updatedAtUtc: "ModifiedDateUtc",
        },
      },
    ],
  },
] as const;

const BY_SECTION_ID = new Map(
  SECTION_RECORD_SPECS.map((spec) => [spec.sectionId, spec]),
);

export function sectionRecordSpecForId(
  sectionId: number,
): SectionRecordSpec | undefined {
  return BY_SECTION_ID.get(sectionId);
}

export function isCrudSectionId(sectionId: number): boolean {
  return BY_SECTION_ID.has(sectionId);
}

export function tableSpecFor(
  sectionId: number,
  liveTable: string,
): SectionTableSpec | undefined {
  const spec = BY_SECTION_ID.get(sectionId);
  if (!spec) return undefined;
  const normalized = liveTable.trim().toLowerCase();
  return spec.tables.find((t) => t.liveTable.toLowerCase() === normalized);
}
