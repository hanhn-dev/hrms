const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const MASTER_DATA_GROUP_IDS = ["organization", "profile", "other"] as const;

export type MasterDataGroupId = (typeof MASTER_DATA_GROUP_IDS)[number];

export const MASTER_DATA_GROUPS: ReadonlyArray<{
  id: MasterDataGroupId;
  label: string;
}> = [
  { id: "organization", label: "Organization" },
  { id: "profile", label: "Profile lookups" },
  { id: "other", label: "Other" },
];

export type MasterDataColumnKind = "text" | "int" | "bit" | "yn";

export type MasterDataColumn = {
  name: string;
  label: string;
  kind: MasterDataColumnKind;
  required?: boolean;
  maxLength?: number;
  /** Catalog key whose id is stored in this column. */
  lookupKey?: string;
  /** Column on the lookup list used as the option label. */
  lookupLabelColumn?: string;
};

export type MasterDataStamps = {
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
};

export type MasterDataEntry = {
  key: string;
  label: string;
  group: MasterDataGroupId;
  table: string;
  idColumn: string;
  /** Identity columns are assigned by the database. Manual ids are entered on insert. */
  idMode: "identity" | "manual";
  scope: "employer" | "global";
  employerColumn?: string;
  columns: MasterDataColumn[];
  stamps?: MasterDataStamps;
};

export type MasterDataValue = string | number | boolean | null;

export type MasterDataRow = Record<string, MasterDataValue>;

function ident(name: string): string {
  if (!SQL_IDENT.test(name)) {
    throw new Error(`Refusing to use identifier ${name}.`);
  }
  return name;
}

function text(
  name: string,
  label: string,
  extra: Partial<Omit<MasterDataColumn, "name" | "label" | "kind">> = {},
): MasterDataColumn {
  return { name: ident(name), label, kind: "text", ...extra };
}

function intColumn(
  name: string,
  label: string,
  extra: Partial<Omit<MasterDataColumn, "name" | "label" | "kind">> = {},
): MasterDataColumn {
  return { name: ident(name), label, kind: "int", ...extra };
}

function status(name: string, kind: "bit" | "yn"): MasterDataColumn {
  return { name: ident(name), label: "Status", kind };
}

function lookup(
  name: string,
  label: string,
  lookupKey: string,
  lookupLabelColumn: string,
): MasterDataColumn {
  return {
    name: ident(name),
    label,
    kind: "int",
    lookupKey,
    lookupLabelColumn: ident(lookupLabelColumn),
  };
}

function entry(
  definition: MasterDataEntry,
): MasterDataEntry {
  ident(definition.table);
  ident(definition.idColumn);
  if (definition.scope === "employer") {
    if (!definition.employerColumn) {
      throw new Error(`${definition.key} is employer-scoped without an employer column.`);
    }
    ident(definition.employerColumn);
  }
  for (const stamp of Object.values(definition.stamps ?? {})) {
    if (stamp) {
      ident(stamp);
    }
  }
  return definition;
}

const employerStamps: MasterDataStamps = {
  createdBy: "CreatedBy",
  createdDate: "CreatedDate",
  updatedBy: "UpdatedBy",
  updatedDate: "Updatedate",
};

/**
 * Reference lists an operator can search from the employer console.
 * Column names match the CREATE TABLE scripts in HRMS-DATABASE. A column
 * missing from the connected database is dropped at read time.
 */
export const MASTER_DATA_CATALOG: readonly MasterDataEntry[] = [
  entry({
    key: "grade",
    label: "Grade",
    group: "organization",
    table: "TGrade",
    idColumn: "GradeId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [
      text("GradeName", "Grade", { required: true, maxLength: 50 }),
      text("GradeDesc", "Description", { maxLength: 500 }),
      text("GradeBand", "Grade band", { maxLength: 50 }),
      status("IsActive", "bit"),
    ],
  }),
  entry({
    key: "designation",
    label: "Designation",
    group: "organization",
    table: "TTitle",
    idColumn: "ID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [
      text("Title", "Designation", { required: true, maxLength: 200 }),
      text("TitleDesc", "Description", { maxLength: 500 }),
      text("DesignationLevel", "Level", { maxLength: 20 }),
      status("IsActive", "yn"),
    ],
  }),
  entry({
    key: "location",
    label: "Location",
    group: "organization",
    table: "TLocation",
    idColumn: "LocationId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [
      text("LocationName", "Location", { required: true, maxLength: 200 }),
      lookup("CountryId", "Country", "country", "NAME"),
      text("Address1", "Address", { maxLength: 500 }),
      text("Address2", "Address line 2", { maxLength: 500 }),
      text("ZipCode", "Zip code", { maxLength: 15 }),
      text("PhoneNumber", "Phone", { maxLength: 15 }),
      text("TimeZone", "Time zone", { maxLength: 500 }),
      status("IsActive", "bit"),
    ],
  }),
  entry({
    key: "employment-type",
    label: "Employment type",
    group: "organization",
    table: "TMEmploymentTypes",
    idColumn: "EmploymentTypeID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [
      text("EmploymentType", "Employment type", { required: true, maxLength: 50 }),
      text("PrefixLetter", "Prefix", { maxLength: 10 }),
      intColumn("ProbationPeriodMonths", "Probation months"),
      intColumn("NoticePeriodDays", "Notice period days"),
      status("IsActive", "bit"),
    ],
  }),
  entry({
    key: "bank",
    label: "Bank",
    group: "organization",
    table: "TBank",
    idColumn: "BankId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "EmployerId",
    stamps: {
      createdBy: "CreatedBy",
      createdDate: "CreatedDate",
      updatedBy: "UpdatedBy",
      updatedDate: "UpdatedDate",
    },
    columns: [
      text("BankName", "Bank", { required: true, maxLength: 50 }),
      status("IsActive", "yn"),
    ],
  }),
  entry({
    key: "resignation-reason",
    label: "Resignation reason",
    group: "organization",
    table: "TResignation",
    idColumn: "ResignationId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [
      text("ResignationDescription", "Reason", { required: true, maxLength: 100 }),
      status("IsActive", "yn"),
    ],
  }),
  entry({
    key: "termination-reason",
    label: "Termination reason",
    group: "organization",
    table: "TTerminationReason",
    idColumn: "TerminationReasonID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "EmployerID",
    stamps: {
      createdBy: "CreatedBy",
      createdDate: "CreatedWhen",
      updatedBy: "UpdatedBy",
      updatedDate: "UpdatedWhen",
    },
    columns: [
      text("TerminationReason", "Reason", { required: true, maxLength: 100 }),
      status("IsActive", "bit"),
    ],
  }),
  entry({
    key: "separation-type",
    label: "Separation type",
    group: "organization",
    table: "TSeparationType",
    idColumn: "SeparationTypeId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [
      text("SeparationTypeDescription", "Separation type", { required: true, maxLength: 100 }),
      status("IsActive", "yn"),
    ],
  }),
  entry({
    key: "skill-category",
    label: "Skill category",
    group: "organization",
    table: "TCategory",
    idColumn: "ID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [
      text("Category", "Skill category", { required: true, maxLength: 100 }),
      status("IsActive", "yn"),
    ],
  }),
  entry({
    key: "skill",
    label: "Skill",
    group: "organization",
    table: "TMSkills",
    idColumn: "SkillID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "employerid",
    stamps: employerStamps,
    columns: [
      text("SkillName", "Skill", { required: true, maxLength: 200 }),
      text("SkillDescription", "Description", { maxLength: 200 }),
      lookup("TypeID", "Skill type", "skill-type", "TypeName"),
    ],
  }),
  entry({
    key: "domain",
    label: "Domain",
    group: "organization",
    table: "TSkillDomainMaster",
    idColumn: "Domainid",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: {
      createdBy: "CreatedBy",
      createdDate: "CreateDate",
      updatedBy: "ModifiedBy",
      updatedDate: "ModifiedDate",
    },
    columns: [
      text("DomainName", "Domain", { required: true, maxLength: 250 }),
      text("DomainDescription", "Description", { maxLength: 500 }),
      status("IsActive", "bit"),
    ],
  }),
  entry({
    key: "country",
    label: "Country",
    group: "profile",
    table: "TCOUNTRY",
    idColumn: "ID",
    idMode: "identity",
    scope: "global",
    columns: [
      text("ISO", "ISO", { required: true, maxLength: 2 }),
      text("NAME", "Country", { required: true, maxLength: 80 }),
      text("NICENAME", "Nice name", { required: true, maxLength: 80 }),
      text("COUNTRYCODE", "Country code", { maxLength: 3 }),
      intColumn("PHONECODE", "Phone code", { required: true }),
      text("CURRENCYCODE", "Currency code", { maxLength: 100 }),
      text("CURRENCYNAME", "Currency name", { maxLength: 50 }),
    ],
  }),
  entry({
    key: "visa-type",
    label: "Visa type",
    group: "profile",
    table: "TVisaType",
    idColumn: "VisaTypeId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [text("VisaType", "Visa type", { required: true, maxLength: 20 })],
  }),
  entry({
    key: "account-type",
    label: "Account type",
    group: "profile",
    table: "TAccountType",
    idColumn: "AccountTypeId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [text("AccountTypeName", "Account type", { required: true, maxLength: 100 })],
  }),
  entry({
    key: "qualification-level",
    label: "Qualification level",
    group: "profile",
    table: "TQualificationLevel",
    idColumn: "QualificationLevelId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "employerid",
    stamps: employerStamps,
    columns: [
      text("QualificationLevelName", "Level", { required: true, maxLength: 100 }),
    ],
  }),
  entry({
    key: "subject",
    label: "Subject",
    group: "profile",
    table: "TSubject",
    idColumn: "SubjectId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "employerid",
    stamps: employerStamps,
    columns: [text("SubjectName", "Subject", { required: true, maxLength: 50 })],
  }),
  entry({
    key: "university",
    label: "University",
    group: "profile",
    table: "TUniverSity",
    idColumn: "UniversityId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [text("UniversityName", "University", { required: true, maxLength: 300 })],
  }),
  entry({
    key: "certificate",
    label: "Certificate",
    group: "profile",
    table: "TCertification",
    idColumn: "CertificateID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "employerid",
    stamps: employerStamps,
    columns: [
      text("CertificationName", "Certificate", { required: true, maxLength: 100 }),
      text("CertificationDesc", "Description", { maxLength: 250 }),
    ],
  }),
  entry({
    key: "discipline",
    label: "Discipline",
    group: "profile",
    table: "TQualificationName",
    idColumn: "ID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [text("QualificationName", "Discipline", { required: true, maxLength: 100 })],
  }),
  entry({
    key: "establishment-type",
    label: "Type of institute",
    group: "profile",
    table: "TEstablishmentType",
    idColumn: "EstablishmentTypeId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "employerid",
    stamps: employerStamps,
    columns: [
      text("EstablishmentType", "Type of institute", { required: true, maxLength: 100 }),
    ],
  }),
  entry({
    key: "establishment-name",
    label: "Name of institute",
    group: "profile",
    table: "TEstablishmentName",
    idColumn: "EstablishmentNameId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "employerid",
    stamps: employerStamps,
    columns: [
      text("EstablishmentName", "Name of institute", { required: true, maxLength: 100 }),
    ],
  }),
  entry({
    key: "major-field",
    label: "Major field",
    group: "profile",
    table: "TMajorField",
    idColumn: "MajorFieldId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [text("MajorFieldDesc", "Major field", { required: true, maxLength: 100 })],
  }),
  entry({
    key: "minor-field",
    label: "Minor field",
    group: "profile",
    table: "TMinorField",
    idColumn: "MinorFieldId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [text("MinorFieldDesc", "Minor field", { required: true, maxLength: 100 })],
  }),
  entry({
    key: "document-category",
    label: "Document category",
    group: "profile",
    table: "TAttachmentCategory",
    idColumn: "ID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: employerStamps,
    columns: [text("Category", "Document category", { required: true, maxLength: 100 })],
  }),
  entry({
    key: "skill-type",
    label: "Skill type",
    group: "profile",
    table: "TMSkillTypes",
    idColumn: "TypeID",
    idMode: "manual",
    scope: "global",
    columns: [
      text("TypeName", "Skill type", { required: true, maxLength: 50 }),
      text("TypeValue", "Code", { required: true, maxLength: 2 }),
    ],
  }),
  entry({
    key: "cost-center",
    label: "Cost center",
    group: "other",
    table: "TCostCenters",
    idColumn: "CostCenterID",
    idMode: "identity",
    scope: "global",
    columns: [
      text("CostCenterCode", "Code", { required: true, maxLength: 10 }),
      text("CostCenterDesc", "Description", { required: true, maxLength: 50 }),
    ],
  }),
  entry({
    key: "relationship",
    label: "Relationship",
    group: "other",
    table: "TEmergencyRelationship",
    idColumn: "ID",
    idMode: "identity",
    scope: "employer",
    employerColumn: "Employerid",
    stamps: { createdDate: "CreatedDate", updatedDate: "UpdatedDate" },
    columns: [
      text("Relationship", "Relationship", { required: true, maxLength: 100 }),
      status("IsActive", "yn"),
    ],
  }),
  entry({
    key: "helpdesk-category",
    label: "Helpdesk category",
    group: "other",
    table: "THelpdeskCategory",
    idColumn: "CategoryId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "EmployerId",
    stamps: {
      createdBy: "CreatedBy",
      createdDate: "CreatedDate",
      updatedBy: "UpdatedBy",
      updatedDate: "UpdatedDate",
    },
    columns: [
      text("CategoryType", "Type", { maxLength: 50 }),
      text("CategoryName", "Category", { required: true, maxLength: 200 }),
      status("IsActive", "yn"),
    ],
  }),
  entry({
    key: "employee-search-purpose",
    label: "Employee search purpose",
    group: "other",
    table: "TEmployeeSearchPurposeMaster",
    idColumn: "EmpSearchId",
    idMode: "identity",
    scope: "employer",
    employerColumn: "EmployerId",
    stamps: {
      createdBy: "CreatedBy",
      createdDate: "CreateDate",
      updatedBy: "UpdatedBy",
      updatedDate: "UpdateDate",
    },
    columns: [
      text("EmployeeSearchPurpose", "Purpose", { required: true, maxLength: 100 }),
      status("IsActive", "yn"),
    ],
  }),
];

const CATALOG_BY_KEY = new Map(MASTER_DATA_CATALOG.map((item) => [item.key, item]));

export function getMasterDataEntry(key: string): MasterDataEntry | null {
  return CATALOG_BY_KEY.get(key) ?? null;
}

export function requireMasterDataEntry(key: string): MasterDataEntry {
  const found = getMasterDataEntry(key);
  if (!found) {
    throw new Error(`Unknown master data list: ${key}.`);
  }
  return found;
}

/** Employer id to bind, or null when the list is shared across employers. */
export function masterDataEmployerId(
  entry: MasterDataEntry,
  employerId: number,
): number | null {
  if (!Number.isInteger(employerId) || employerId <= 0) {
    throw new Error("Employer id is required.");
  }
  if (entry.scope === "global") {
    return null;
  }
  return employerId;
}

export function editableMasterDataColumns(
  entry: MasterDataEntry,
  mode: "insert" | "update",
): MasterDataColumn[] {
  if (mode === "insert" && entry.idMode === "manual") {
    return [
      {
        name: entry.idColumn,
        label: "Id",
        kind: "int",
        required: true,
      },
      ...entry.columns,
    ];
  }
  return entry.columns;
}
