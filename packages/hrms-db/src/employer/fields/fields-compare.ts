export type FieldCatalogRow = {
  fieldId: number;
  sectionId: number | null;
  section: string | null;
  employerId: number | null;
  countryId: number | null;
  countryName: string | null;
  fieldName: string | null;
  displayText: string | null;
  displayOrder: number | null;
  fieldEntity: string | null;
  fieldTypeId: number | null;
  fieldType: string | null;
  isMandatory: boolean | number | null;
  isValidate: boolean | number | null;
  validationRule: string | null;
  isHidden: boolean | number | null;
  isActive: boolean | number | null;
  isDefault: boolean | number | null;
  dbTable: string | null;
  dbColumn: string | null;
};

export type FieldCompareStatus =
  | "missing-on-employer"
  | "extra-on-employer"
  | "drift";

export type FieldCompareRow = {
  key: string;
  sectionId: number | null;
  section: string | null;
  fieldName: string | null;
  countryId: number | null;
  countryName: string | null;
  fieldEntity: string | null;
  status: FieldCompareStatus;
  driftedProperties: string[];
  employer: FieldCatalogRow | null;
  template: FieldCatalogRow | null;
};

const COMPARED_PROPERTIES = [
  "displayText",
  "fieldType",
  "isMandatory",
  "isValidate",
  "validationRule",
  "isHidden",
  "isActive",
] as const;

export function compareEmployerFieldsToTemplate(
  employerRows: FieldCatalogRow[],
  templateRows: FieldCatalogRow[],
): FieldCompareRow[] {
  const unusedEmployer = new Map<string, FieldCatalogRow[]>();
  for (const row of employerRows) {
    const key = matchKey(row);
    const bucket = unusedEmployer.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      unusedEmployer.set(key, [row]);
    }
  }

  const compared: FieldCompareRow[] = [];

  for (const template of templateRows) {
    const key = matchKey(template);
    const bucket = unusedEmployer.get(key);
    const employer = bucket?.shift() ?? null;
    if (bucket && bucket.length === 0) {
      unusedEmployer.delete(key);
    }
    if (!employer) {
      compared.push(
        compareRow("missing-on-employer", null, template, [
          "missing on employer",
        ]),
      );
      continue;
    }
    const driftedProperties = driftedPropertyLabels(employer, template);
    if (driftedProperties.length > 0) {
      compared.push(compareRow("drift", employer, template, driftedProperties));
    }
  }

  for (const leftover of unusedEmployer.values()) {
    for (const employer of leftover) {
      compared.push(
        compareRow("extra-on-employer", employer, null, ["extra on employer"]),
      );
    }
  }

  return compared.sort(compareBySectionIdThenName);
}

function matchKey(row: FieldCatalogRow): string {
  return [
    row.sectionId ?? "",
    normalizeText(row.fieldName).toLowerCase(),
    row.countryId ?? 0,
    normalizeText(row.fieldEntity).toLowerCase(),
  ].join("\u0001");
}

function driftedPropertyLabels(
  employer: FieldCatalogRow,
  template: FieldCatalogRow,
): string[] {
  const labels: string[] = [];
  for (const property of COMPARED_PROPERTIES) {
    if (!sameComparedValue(employer[property], template[property], property)) {
      labels.push(propertyLabel(property));
    }
  }
  if (employer.fieldTypeId !== template.fieldTypeId) {
    if (!labels.includes("FieldType")) {
      labels.push("FieldType");
    }
  }
  return labels;
}

function sameComparedValue(
  employerValue: unknown,
  templateValue: unknown,
  property: (typeof COMPARED_PROPERTIES)[number],
): boolean {
  if (
    property === "isMandatory" ||
    property === "isValidate" ||
    property === "isHidden" ||
    property === "isActive"
  ) {
    return asFlag(employerValue) === asFlag(templateValue);
  }
  return (
    normalizeText(String(employerValue ?? "")) ===
    normalizeText(String(templateValue ?? ""))
  );
}

function propertyLabel(
  property: (typeof COMPARED_PROPERTIES)[number],
): string {
  switch (property) {
    case "displayText":
      return "DisplayText";
    case "fieldType":
      return "FieldType";
    case "isMandatory":
      return "IsMandatory";
    case "isValidate":
      return "IsValidate";
    case "validationRule":
      return "ValidationRule";
    case "isHidden":
      return "IsHidden";
    case "isActive":
      return "IsActive";
  }
}

function compareRow(
  status: FieldCompareStatus,
  employer: FieldCatalogRow | null,
  template: FieldCatalogRow | null,
  driftedProperties: string[],
): FieldCompareRow {
  const source = employer ?? template;
  return {
    key: [
      status,
      source?.sectionId ?? "",
      source?.fieldName ?? "",
      source?.countryId ?? "",
      source?.fieldEntity ?? "",
      employer?.fieldId ?? "",
      template?.fieldId ?? "",
    ].join(":"),
    sectionId: source?.sectionId ?? null,
    section: source?.section ?? null,
    fieldName: source?.fieldName ?? null,
    countryId: source?.countryId ?? null,
    countryName: source?.countryName ?? null,
    fieldEntity: source?.fieldEntity ?? null,
    status,
    driftedProperties,
    employer,
    template,
  };
}

function compareBySectionIdThenName(
  left: FieldCompareRow,
  right: FieldCompareRow,
): number {
  const sectionId =
    (left.sectionId ?? Number.MAX_SAFE_INTEGER) -
    (right.sectionId ?? Number.MAX_SAFE_INTEGER);
  if (sectionId !== 0) {
    return sectionId;
  }
  return (left.fieldName ?? "").localeCompare(right.fieldName ?? "");
}

function asFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}
