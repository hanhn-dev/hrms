import { Prisma } from "../../generated/prisma/client.ts";
import type { HrmsDb } from "../../shared/client";
import { sqlIdent, sqlTable } from "../history/sql.ts";

/**
 * Master links for My Details section grids.
 * Several of these are product lookups without a foreign-key constraint
 * (DomainId, and the education links dropped in DDL/109390). Names come
 * only from this list.
 */

export type SectionLookupColumn = {
  name: string;
  label: string;
};

export type SectionLookupRef = {
  id: number;
  label: string | null;
  lookupKey: string;
};

export type SectionLookupDetail = {
  lookupKey: string;
  title: string;
  id: number;
  found: boolean;
  items: { label: string; value: string | null }[];
};

type LookupJoin = {
  table: string;
  /** Column on the joined table. */
  idColumn: string;
  /** Column on the master row that stores the joined id. */
  fromColumn: string;
  columns: readonly SectionLookupColumn[];
};

type LookupDefinition = {
  key: string;
  title: string;
  masterTable: string;
  idColumn: string;
  labelColumn: string;
  columns: readonly SectionLookupColumn[];
  join?: LookupJoin;
};

type LookupSource = {
  liveTable: string;
  column: string;
  lookupKey: string;
};

const LOOKUPS: readonly LookupDefinition[] = [
  {
    key: "skill",
    title: "Skill",
    masterTable: "TMSkills",
    idColumn: "SkillID",
    labelColumn: "SkillName",
    columns: [
      { name: "SkillID", label: "Id" },
      { name: "SkillName", label: "Skill" },
      { name: "SkillDescription", label: "Description" },
      { name: "TypeID", label: "Skill type" },
    ],
  },
  {
    key: "domain",
    title: "Domain",
    masterTable: "TSkillDomainMaster",
    idColumn: "Domainid",
    labelColumn: "DomainName",
    columns: [
      { name: "Domainid", label: "Id" },
      { name: "DomainName", label: "Domain" },
      { name: "DomainDescription", label: "Description" },
      { name: "IsActive", label: "Status" },
    ],
  },
  {
    key: "visa-type",
    title: "Visa type",
    masterTable: "TVisaType",
    idColumn: "VisaTypeId",
    labelColumn: "VisaType",
    columns: [
      { name: "VisaTypeId", label: "Id" },
      { name: "VisaType", label: "Visa type" },
    ],
  },
  {
    key: "country",
    title: "Country",
    masterTable: "TCOUNTRY",
    idColumn: "ID",
    labelColumn: "NICENAME",
    columns: [
      { name: "ID", label: "Id" },
      { name: "ISO", label: "ISO" },
      { name: "NAME", label: "Country" },
      { name: "NICENAME", label: "Nice name" },
      { name: "COUNTRYCODE", label: "Country code" },
      { name: "PHONECODE", label: "Phone code" },
      { name: "CURRENCYCODE", label: "Currency code" },
      { name: "CURRENCYNAME", label: "Currency name" },
    ],
  },
  {
    key: "account-type",
    title: "Account type",
    masterTable: "TAccountType",
    idColumn: "AccountTypeId",
    labelColumn: "AccountTypeName",
    columns: [
      { name: "AccountTypeId", label: "Id" },
      { name: "AccountTypeName", label: "Account type" },
    ],
  },
  {
    key: "bank-branch",
    title: "Bank branch",
    masterTable: "TBankBranchDetails",
    idColumn: "ID",
    labelColumn: "BranchName",
    columns: [
      { name: "ID", label: "Id" },
      { name: "BranchName", label: "Branch" },
      { name: "BankIdentifier", label: "Bank identifier" },
      { name: "IsActive", label: "Status" },
      { name: "BankId", label: "Bank Id" },
    ],
    join: {
      table: "TBank",
      idColumn: "BankId",
      fromColumn: "BankId",
      columns: [{ name: "BankName", label: "Bank" }],
    },
  },
  {
    key: "establishment-type",
    title: "Type of institute",
    masterTable: "TEstablishmentType",
    idColumn: "EstablishmentTypeId",
    labelColumn: "EstablishmentType",
    columns: [
      { name: "EstablishmentTypeId", label: "Id" },
      { name: "EstablishmentType", label: "Type of institute" },
    ],
  },
  {
    key: "establishment-name",
    title: "Name of institute",
    masterTable: "TEstablishmentName",
    idColumn: "EstablishmentNameId",
    labelColumn: "EstablishmentName",
    columns: [
      { name: "EstablishmentNameId", label: "Id" },
      { name: "EstablishmentName", label: "Name of institute" },
    ],
  },
  {
    key: "university",
    title: "University",
    masterTable: "TUniverSity",
    idColumn: "UniversityId",
    labelColumn: "UniversityName",
    columns: [
      { name: "UniversityId", label: "Id" },
      { name: "UniversityName", label: "University" },
    ],
  },
  {
    key: "discipline",
    title: "Discipline",
    masterTable: "TQualificationName",
    idColumn: "ID",
    labelColumn: "QualificationName",
    columns: [
      { name: "ID", label: "Id" },
      { name: "QualificationName", label: "Discipline" },
    ],
  },
  {
    key: "qualification-level",
    title: "Qualification level",
    masterTable: "TQualificationLevel",
    idColumn: "QualificationLevelId",
    labelColumn: "QualificationLevelName",
    columns: [
      { name: "QualificationLevelId", label: "Id" },
      { name: "QualificationLevelName", label: "Level" },
    ],
  },
  {
    key: "subject",
    title: "Subject",
    masterTable: "TSubject",
    idColumn: "SubjectId",
    labelColumn: "SubjectName",
    columns: [
      { name: "SubjectId", label: "Id" },
      { name: "SubjectName", label: "Subject" },
    ],
  },
  {
    key: "major-field",
    title: "Major field",
    masterTable: "TMajorField",
    idColumn: "MajorFieldId",
    labelColumn: "MajorFieldDesc",
    columns: [
      { name: "MajorFieldId", label: "Id" },
      { name: "MajorFieldDesc", label: "Major field" },
    ],
  },
  {
    key: "minor-field",
    title: "Minor field",
    masterTable: "TMinorField",
    idColumn: "MinorFieldId",
    labelColumn: "MinorFieldDesc",
    columns: [
      { name: "MinorFieldId", label: "Id" },
      { name: "MinorFieldDesc", label: "Minor field" },
    ],
  },
  {
    key: "certificate",
    title: "Certificate",
    masterTable: "TCertification",
    idColumn: "CertificateID",
    labelColumn: "CertificationName",
    columns: [
      { name: "CertificateID", label: "Id" },
      { name: "CertificationName", label: "Certificate" },
      { name: "CertificationDesc", label: "Description" },
    ],
  },
  {
    key: "relationship",
    title: "Relationship",
    masterTable: "TEmergencyRelationship",
    idColumn: "ID",
    labelColumn: "Relationship",
    columns: [
      { name: "ID", label: "Id" },
      { name: "Relationship", label: "Relationship" },
      { name: "IsActive", label: "Status" },
    ],
  },
  {
    key: "gender",
    title: "Gender",
    masterTable: "TGender",
    idColumn: "ID",
    labelColumn: "Gender",
    columns: [
      { name: "ID", label: "Id" },
      { name: "Gender", label: "Gender" },
    ],
  },
];

const SOURCES: readonly LookupSource[] = [
  { liveTable: "TEmployeeSkillDetails", column: "SkillId", lookupKey: "skill" },
  { liveTable: "TEmployeeDomainDetails", column: "DomainId", lookupKey: "domain" },
  { liveTable: "TEmployeeVisaInfo", column: "VisaType", lookupKey: "visa-type" },
  { liveTable: "TEmployeeVisaInfo", column: "Country", lookupKey: "country" },
  { liveTable: "TPastEmploymentDetails", column: "CurrencyId", lookupKey: "country" },
  { liveTable: "TEmployeeBankDetails", column: "AccountType", lookupKey: "account-type" },
  { liveTable: "TEmployeeBankDetails", column: "ID", lookupKey: "bank-branch" },
  { liveTable: "TEducationDetails", column: "EstablishmentTypeId", lookupKey: "establishment-type" },
  { liveTable: "TEducationDetails", column: "EstablishmentId", lookupKey: "establishment-name" },
  { liveTable: "TEducationDetails", column: "AffiliateToId", lookupKey: "university" },
  { liveTable: "TEducationDetails", column: "Discipline", lookupKey: "discipline" },
  { liveTable: "TEducationDetails", column: "LevelId", lookupKey: "qualification-level" },
  { liveTable: "TEducationDetails", column: "SubjectId", lookupKey: "subject" },
  { liveTable: "TEducationDetails", column: "MajorFieldId", lookupKey: "major-field" },
  { liveTable: "TEducationDetails", column: "MinorFieldId", lookupKey: "minor-field" },
  { liveTable: "TEducationDetails", column: "CurrencyId", lookupKey: "country" },
  { liveTable: "TCertificationDetails", column: "CertificateId", lookupKey: "certificate" },
  { liveTable: "TCertificationDetails", column: "SubjectId", lookupKey: "skill" },
  { liveTable: "TEmployeeFamilyDetails", column: "Relation", lookupKey: "relationship" },
  { liveTable: "TEmployeeFamilyDetails", column: "Relationship", lookupKey: "relationship" },
  { liveTable: "TEmployeeFamilyDetails", column: "Gender", lookupKey: "gender" },
  { liveTable: "TEmployeeEmergencyContactDetails", column: "Relation", lookupKey: "relationship" },
  { liveTable: "TEmployeeEmergencyContactDetails", column: "Relationship", lookupKey: "relationship" },
  { liveTable: "TEmployeeNomination", column: "Relationship", lookupKey: "relationship" },
  { liveTable: "TEmployeeNomination", column: "Relation", lookupKey: "relationship" },
  { liveTable: "TEmployeeNomination", column: "Gender", lookupKey: "gender" },
  { liveTable: "TEmployeeNominee_Details", column: "Relationship", lookupKey: "relationship" },
  { liveTable: "TEmployeeNominee_Details", column: "NomineeGender", lookupKey: "gender" },
  {
    liveTable: "TEmployeeNominee_Details",
    column: "NomineeGuardianRelwithNominee",
    lookupKey: "relationship",
  },
];

const LOOKUP_BY_KEY = new Map(LOOKUPS.map((lookup) => [lookup.key, lookup]));

export type SectionLookupField = {
  fieldId?: number;
  displayText: string;
  dbTable: string | null;
  dbColumn: string | null;
};

export type SectionLookupQuery = {
  joins: Prisma.Sql;
  selects: Prisma.Sql[];
  bindings: { fieldId: number; alias: string; lookupKey: string }[];
};

function sameIdent(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function numericLookupId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return parsed > 0 ? parsed : null;
  }
  return null;
}

export function sectionLookupFor(
  liveTable: string,
  column: string | null | undefined,
): LookupDefinition | undefined {
  if (!column || column.trim() === "") return undefined;
  const source = SOURCES.find(
    (item) => sameIdent(item.liveTable, liveTable) && sameIdent(item.column, column),
  );
  if (!source) return undefined;
  return LOOKUP_BY_KEY.get(source.lookupKey);
}

function requireLookup(lookupKey: string): LookupDefinition {
  const lookup = LOOKUP_BY_KEY.get(lookupKey);
  if (!lookup) {
    throw new Error(`Unknown section lookup ${lookupKey}.`);
  }
  return lookup;
}

export function sectionLookupQuery(
  liveTable: string,
  fields: readonly SectionLookupField[],
  sourceAlias = "src",
): SectionLookupQuery {
  const joins: Prisma.Sql[] = [];
  const selects: Prisma.Sql[] = [];
  const bindings: SectionLookupQuery["bindings"] = [];

  for (const field of fields) {
    if (field.fieldId == null) continue;
    if (!field.dbTable || !sameIdent(field.dbTable, liveTable)) continue;
    const lookup = sectionLookupFor(liveTable, field.dbColumn);
    if (!lookup) continue;
    const alias = `lk_${field.fieldId}`;
    const labelAlias = `n_${field.fieldId}`;
    const joinAlias = sqlIdent(alias);
    const sourceColumn = Prisma.sql`${sqlIdent(sourceAlias)}.${sqlIdent(field.dbColumn!)}`;
    joins.push(Prisma.sql`
      LEFT JOIN ${sqlTable(lookup.masterTable)} AS ${joinAlias}
        ON ${joinAlias}.${sqlIdent(lookup.idColumn)} = TRY_CONVERT(int, ${sourceColumn})`);
    selects.push(
      Prisma.sql`${joinAlias}.${sqlIdent(lookup.labelColumn)} AS ${sqlIdent(labelAlias)}`,
    );
    bindings.push({ fieldId: field.fieldId, alias: labelAlias, lookupKey: lookup.key });
  }

  return {
    joins: joins.length > 0 ? Prisma.join(joins, " ") : Prisma.empty,
    selects,
    bindings,
  };
}

function labelText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function sectionLookupRefs(input: {
  liveTable: string;
  fields: readonly SectionLookupField[];
  values: Record<string, string | number | boolean | null>;
  /** Join label for this row, keyed by display text. Null is an orphan id. */
  labelByField?: ReadonlyMap<string, string | null>;
  /** Names loaded by id, keyed by lookup key. */
  labelById?: ReadonlyMap<string, ReadonlyMap<number, string>>;
}): Record<string, SectionLookupRef> {
  const lookups: Record<string, SectionLookupRef> = {};
  for (const field of input.fields) {
    if (!field.dbTable || !sameIdent(field.dbTable, input.liveTable)) continue;
    const lookup = sectionLookupFor(input.liveTable, field.dbColumn);
    if (!lookup) continue;
    const id = numericLookupId(input.values[field.displayText]);
    if (id == null) continue;
    let label: string | null = null;
    if (input.labelByField?.has(field.displayText)) {
      label = input.labelByField.get(field.displayText) ?? null;
    } else {
      label = labelText(input.labelById?.get(lookup.key)?.get(id) ?? null);
    }
    lookups[field.displayText] = { id, label, lookupKey: lookup.key };
  }
  return lookups;
}

export function withSectionLookups<
  T extends {
    liveTable: string;
    values: Record<string, string | number | boolean | null>;
  },
>(
  fields: readonly SectionLookupField[],
  rows: readonly T[],
  labelById: ReadonlyMap<string, ReadonlyMap<number, string>>,
): Array<T & { lookups: Record<string, SectionLookupRef> }> {
  return rows.map((row) => ({
    ...row,
    lookups: sectionLookupRefs({
      liveTable: row.liveTable,
      fields,
      values: row.values,
      labelById,
    }),
  }));
}

function idsForRows(
  fields: readonly SectionLookupField[],
  rows: readonly {
    liveTable: string;
    values: Record<string, string | number | boolean | null>;
  }[],
): Map<string, number[]> {
  const ids = new Map<string, Set<number>>();
  for (const row of rows) {
    for (const field of fields) {
      if (!field.dbTable || !sameIdent(field.dbTable, row.liveTable)) continue;
      const lookup = sectionLookupFor(row.liveTable, field.dbColumn);
      if (!lookup) continue;
      const id = numericLookupId(row.values[field.displayText]);
      if (id == null) continue;
      const bucket = ids.get(lookup.key) ?? new Set<number>();
      bucket.add(id);
      ids.set(lookup.key, bucket);
    }
  }
  return new Map([...ids].map(([key, bucket]) => [key, [...bucket]]));
}

export async function loadSectionLookupLabels(
  db: HrmsDb,
  fields: readonly SectionLookupField[],
  rows: readonly {
    liveTable: string;
    values: Record<string, string | number | boolean | null>;
  }[],
): Promise<Map<string, Map<number, string>>> {
  const labels = new Map<string, Map<number, string>>();
  for (const [lookupKey, ids] of idsForRows(fields, rows)) {
    if (ids.length === 0) continue;
    const lookup = requireLookup(lookupKey);
    const loaded = await db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT ${sqlIdent(lookup.idColumn)} AS [LookupId],
             ${sqlIdent(lookup.labelColumn)} AS [LookupLabel]
      FROM ${sqlTable(lookup.masterTable)}
      WHERE ${sqlIdent(lookup.idColumn)} IN (${Prisma.join(ids)})
    `;
    const byId = new Map<number, string>();
    for (const row of loaded) {
      const id = numericLookupId(row.LookupId ?? row.lookupid);
      const label = labelText(row.LookupLabel ?? row.lookuplabel);
      if (id != null && label) byId.set(id, label);
    }
    labels.set(lookupKey, byId);
  }
  return labels;
}

function detailText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return String(value);
  const text = String(value).trim();
  return text === "" ? null : text;
}

function rowCell(row: Record<string, unknown>, alias: string): unknown {
  if (alias in row) return row[alias];
  const found = Object.keys(row).find((key) => key.toLowerCase() === alias.toLowerCase());
  return found ? row[found] : undefined;
}

export function sectionLookupDetailQuery(lookupKey: string, id: number): Prisma.Sql {
  const lookup = requireLookup(lookupKey);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Section lookup id must be a positive whole number.`);
  }
  const master = sqlIdent("m");
  const selects = lookup.columns.map(
    (column, index) =>
      Prisma.sql`${master}.${sqlIdent(column.name)} AS ${sqlIdent(`c_${index}`)}`,
  );
  const join = lookup.join;
  if (join) {
    const joined = sqlIdent("j");
    join.columns.forEach((column, index) => {
      selects.push(
        Prisma.sql`${joined}.${sqlIdent(column.name)} AS ${sqlIdent(`j_${index}`)}`,
      );
    });
    return Prisma.sql`
      SELECT ${Prisma.join(selects)}
      FROM ${sqlTable(lookup.masterTable)} AS ${master}
      LEFT JOIN ${sqlTable(join.table)} AS ${joined}
        ON ${joined}.${sqlIdent(join.idColumn)} = ${master}.${sqlIdent(join.fromColumn)}
      WHERE ${master}.${sqlIdent(lookup.idColumn)} = ${id}
    `;
  }
  return Prisma.sql`
    SELECT ${Prisma.join(selects)}
    FROM ${sqlTable(lookup.masterTable)} AS ${master}
    WHERE ${master}.${sqlIdent(lookup.idColumn)} = ${id}
  `;
}

export async function getSectionLookupRow(
  db: HrmsDb,
  lookupKey: string,
  id: number,
): Promise<SectionLookupDetail> {
  const lookup = requireLookup(lookupKey);
  const rows = await db.$queryRaw<Array<Record<string, unknown>>>(
    sectionLookupDetailQuery(lookupKey, id),
  );
  const row = rows[0];
  if (!row) {
    return { lookupKey, title: lookup.title, id, found: false, items: [] };
  }
  const items = lookup.columns.map((column, index) => ({
    label: column.label,
    value: detailText(rowCell(row, `c_${index}`)),
  }));
  lookup.join?.columns.forEach((column, index) => {
    items.push({
      label: column.label,
      value: detailText(rowCell(row, `j_${index}`)),
    });
  });
  return { lookupKey, title: lookup.title, id, found: true, items };
}
