"use client";

import { useMemo, useState } from "react";
import { Collapse, Input, Select, Table, Tabs, Tag } from "antd";
import { usePathname, useRouter } from "next/navigation";
import type { FieldSource } from "@/features/employer/fields/fields-source";
import type {
  FieldCatalogRow,
  FieldCompareRow,
  FieldCompareStatus,
} from "@/features/employer/fields/queries";
import {
  ValidationRuleCell,
  ValidationRuleViewCell,
} from "@/features/employer/fields/validation-rule-cell";

const DEFAULT_ENTITIES = ["System", "Country", "Custom"];
const KNOWN_ENTITIES = [
  "System",
  "Country",
  "Custom",
  "Segment",
  "BulkCreation",
];

export function FieldsPanel({
  employerFields,
  templateFields,
  compared,
  source,
  employerId,
  writesEnabled,
}: {
  employerFields: FieldCatalogRow[];
  templateFields: FieldCatalogRow[];
  compared: FieldCompareRow[];
  source: FieldSource;
  employerId: number;
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [entities, setEntities] = useState<string[]>(DEFAULT_ENTITIES);
  const [search, setSearch] = useState("");

  const entityOptions = useMemo(
    () => entityFilterOptions(employerFields, templateFields),
    [employerFields, templateFields],
  );

  const visibleEmployer = useMemo(
    () => filterCatalogRows(employerFields, entities, search),
    [employerFields, entities, search],
  );
  const visibleTemplate = useMemo(
    () => filterCatalogRows(templateFields, entities, search),
    [templateFields, entities, search],
  );
  const visibleCompared = useMemo(
    () => filterCompareRows(compared, entities, search),
    [compared, entities, search],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          allowClear
          className="min-w-64"
          maxTagCount="responsive"
          mode="multiple"
          optionFilterProp="label"
          options={entityOptions}
          placeholder="FieldEntity"
          value={entities}
          onChange={setEntities}
        />
        <Input.Search
          allowClear
          className="max-w-sm"
          placeholder="Search FieldName or DisplayText"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
      </div>
      <Tabs
        activeKey={source}
        onChange={(next) => {
          router.push(`${pathname}?source=${next}`);
        }}
        items={[
          {
            key: "employer",
            label: `Employer fields (${employerFields.length})`,
            children: (
              <SectionedFields
                emptyText="No employer fields match the current filters."
                employerId={employerId}
                fields={visibleEmployer}
                writesEnabled={writesEnabled}
              />
            ),
          },
          {
            key: "template",
            label: `Template (${templateFields.length})`,
            children: (
              <SectionedFields
                emptyText="No template fields match the current filters."
                fields={visibleTemplate}
              />
            ),
          },
          {
            key: "compare",
            label: `Compare (${compared.length})`,
            children: (
              <SectionedCompare
                emptyText="No template vs employer differences match the current filters."
                rows={visibleCompared}
              />
            ),
          },
        ]}
      />
    </>
  );
}

function SectionedFields({
  fields,
  emptyText,
  employerId,
  writesEnabled,
}: {
  fields: FieldCatalogRow[];
  emptyText: string;
  employerId?: number;
  writesEnabled?: boolean;
}): React.JSX.Element {
  const sections = groupBySection(fields);
  if (sections.length === 0) {
    return <p className="text-slate-500">{emptyText}</p>;
  }
  return (
    <Collapse
      items={sections.map((section) => ({
        key: section.key,
        label: `${section.section} (${section.fields.length})`,
        children: (
          <FieldsTable
            employerId={employerId}
            fields={section.fields}
            writesEnabled={writesEnabled}
          />
        ),
      }))}
    />
  );
}

function SectionedCompare({
  rows,
  emptyText,
}: {
  rows: FieldCompareRow[];
  emptyText: string;
}): React.JSX.Element {
  const sections = groupCompareBySection(rows);
  if (sections.length === 0) {
    return <p className="text-slate-500">{emptyText}</p>;
  }
  return (
    <Collapse
      items={sections.map((section) => ({
        key: section.key,
        label: `${section.section} (${section.rows.length})`,
        children: <CompareTable rows={section.rows} />,
      }))}
    />
  );
}

function FieldsTable({
  fields,
  employerId,
  writesEnabled,
}: {
  fields: FieldCatalogRow[];
  employerId?: number;
  writesEnabled?: boolean;
}): React.JSX.Element {
  return (
    <Table
      rowKey="fieldId"
      dataSource={fields}
      size="small"
      scroll={{ x: "max-content" }}
      pagination={
        fields.length > 20
          ? { pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} fields` }
          : false
      }
      columns={[
        { title: "FieldName", dataIndex: "fieldName", width: 180 },
        { title: "DisplayText", dataIndex: "displayText", width: 200 },
        {
          title: "FieldEntity",
          dataIndex: "fieldEntity",
          width: 130,
          render: (value: string | null) => <EntityTag entity={value} />,
        },
        {
          title: "FieldType",
          dataIndex: "fieldType",
          width: 150,
          render: (value: string | null) => value ?? "—",
        },
        {
          title: "IsMandatory",
          dataIndex: "isMandatory",
          width: 120,
          render: (value: unknown, row: FieldCatalogRow) =>
            asFlag(row.isDefault) ? (
              <Tag color="blue">System Mandatory</Tag>
            ) : (
              <FlagTag value={value} />
            ),
        },
        {
          title: "IsValidate",
          dataIndex: "isValidate",
          width: 110,
          render: (value: unknown) => <FlagTag value={value} />,
        },
        {
          title: "ValidationRule",
          dataIndex: "validationRule",
          width: 220,
          render: (value: string | null, row: FieldCatalogRow) =>
            employerId != null ? (
              <ValidationRuleCell
                employerId={employerId}
                fieldId={row.fieldId}
                fieldName={row.fieldName}
                value={value}
                writesEnabled={writesEnabled === true}
              />
            ) : (
              <ValidationRuleViewCell value={value} />
            ),
        },
        {
          title: "Hidden",
          dataIndex: "isHidden",
          width: 90,
          render: (value: unknown) => <FlagTag value={value} />,
        },
        {
          title: "Active",
          dataIndex: "isActive",
          width: 90,
          render: (value: unknown) => <FlagTag value={value} />,
        },
        {
          title: "Country",
          key: "country",
          width: 140,
          render: (_: unknown, row: FieldCatalogRow) => countryLabel(row),
        },
        {
          title: "Persist",
          key: "persist",
          width: 220,
          render: (_: unknown, row: FieldCatalogRow) => persistPath(row),
        },
        { title: "FieldID", dataIndex: "fieldId", width: 90 },
      ]}
    />
  );
}

function CompareTable({ rows }: { rows: FieldCompareRow[] }): React.JSX.Element {
  return (
    <Table
      rowKey="key"
      dataSource={rows}
      size="small"
      scroll={{ x: "max-content" }}
      pagination={
        rows.length > 20
          ? {
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${total} differences`,
            }
          : false
      }
      columns={[
        {
          title: "Status",
          dataIndex: "status",
          width: 140,
          render: (status: FieldCompareStatus) => <StatusTag status={status} />,
        },
        { title: "FieldName", dataIndex: "fieldName", width: 180 },
        {
          title: "FieldEntity",
          dataIndex: "fieldEntity",
          width: 130,
          render: (value: string | null) => <EntityTag entity={value} />,
        },
        {
          title: "Differences",
          dataIndex: "driftedProperties",
          width: 280,
          render: (values: string[]) =>
            values.length > 0
              ? values.map((value) => <Tag key={value}>{value}</Tag>)
              : "—",
        },
        {
          title: "Type",
          key: "fieldType",
          width: 200,
          render: (_: unknown, row: FieldCompareRow) =>
            pair(row.employer?.fieldType, row.template?.fieldType),
        },
        {
          title: "Mandatory",
          key: "isMandatory",
          width: 140,
          render: (_: unknown, row: FieldCompareRow) =>
            pair(flagLabel(row.employer?.isMandatory), flagLabel(row.template?.isMandatory)),
        },
        {
          title: "Validate",
          key: "isValidate",
          width: 140,
          render: (_: unknown, row: FieldCompareRow) =>
            pair(flagLabel(row.employer?.isValidate), flagLabel(row.template?.isValidate)),
        },
        {
          title: "DisplayText",
          key: "displayText",
          width: 240,
          render: (_: unknown, row: FieldCompareRow) =>
            pair(row.employer?.displayText, row.template?.displayText),
        },
        {
          title: "ValidationRule",
          key: "validationRule",
          width: 260,
          render: (_: unknown, row: FieldCompareRow) => {
            const left = row.employer?.validationRule ?? null;
            const right = row.template?.validationRule ?? null;
            if ((left ?? "") === (right ?? "")) {
              return <ValidationRuleViewCell value={left} />;
            }
            return (
              <div className="flex items-center gap-1">
                <ValidationRuleViewCell
                  label="Employer ValidationRule"
                  value={left}
                />
                <span>→</span>
                <ValidationRuleViewCell
                  label="Template ValidationRule"
                  value={right}
                />
              </div>
            );
          },
        },
        {
          title: "Country",
          key: "country",
          width: 140,
          render: (_: unknown, row: FieldCompareRow) =>
            countryLabel(row.employer ?? row.template),
        },
      ]}
    />
  );
}

function EntityTag({ entity }: { entity: string | null }): React.JSX.Element {
  if (!entity) {
    return <Tag>Unknown</Tag>;
  }
  return <Tag color={entityColor(entity)}>{entity}</Tag>;
}

function StatusTag({ status }: { status: FieldCompareStatus }): React.JSX.Element {
  if (status === "missing-on-employer") {
    return <Tag color="red">Missing</Tag>;
  }
  if (status === "extra-on-employer") {
    return <Tag color="purple">Extra</Tag>;
  }
  return <Tag color="orange">Drift</Tag>;
}

function FlagTag({ value }: { value: unknown }): React.JSX.Element {
  return asFlag(value) ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>;
}

function filterCatalogRows(
  rows: FieldCatalogRow[],
  entities: string[],
  search: string,
): FieldCatalogRow[] {
  const selected = new Set(entities.map((entity) => entity.toLowerCase()));
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (!selected.has((row.fieldEntity ?? "").trim().toLowerCase())) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      (row.fieldName ?? "").toLowerCase().includes(query) ||
      (row.displayText ?? "").toLowerCase().includes(query)
    );
  });
}

function filterCompareRows(
  rows: FieldCompareRow[],
  entities: string[],
  search: string,
): FieldCompareRow[] {
  const selected = new Set(entities.map((entity) => entity.toLowerCase()));
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (!selected.has((row.fieldEntity ?? "").trim().toLowerCase())) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      (row.fieldName ?? "").toLowerCase().includes(query) ||
      (row.employer?.displayText ?? "").toLowerCase().includes(query) ||
      (row.template?.displayText ?? "").toLowerCase().includes(query)
    );
  });
}

function entityFilterOptions(
  employerFields: FieldCatalogRow[],
  templateFields: FieldCatalogRow[],
): Array<{ label: string; value: string }> {
  const seen = new Map<string, string>();
  for (const name of KNOWN_ENTITIES) {
    seen.set(name.toLowerCase(), name);
  }
  for (const row of [...employerFields, ...templateFields]) {
    const entity = row.fieldEntity?.trim();
    if (entity && !seen.has(entity.toLowerCase())) {
      seen.set(entity.toLowerCase(), entity);
    }
  }
  return [...seen.values()].map((value) => ({ label: value, value }));
}

function groupBySection(fields: FieldCatalogRow[]): Array<{
  key: string;
  sectionId: number | null;
  section: string;
  fields: FieldCatalogRow[];
}> {
  const groups = new Map<
    string,
    { key: string; sectionId: number | null; section: string; fields: FieldCatalogRow[] }
  >();
  for (const field of fields) {
    const key = String(field.sectionId ?? "none");
    const existing = groups.get(key);
    if (existing) {
      existing.fields.push(field);
      continue;
    }
    groups.set(key, {
      key,
      sectionId: field.sectionId,
      section: field.section ?? "Unsectioned",
      fields: [field],
    });
  }
  return [...groups.values()].sort((left, right) => bySectionId(left.sectionId, right.sectionId));
}

function groupCompareBySection(rows: FieldCompareRow[]): Array<{
  key: string;
  sectionId: number | null;
  section: string;
  rows: FieldCompareRow[];
}> {
  const groups = new Map<
    string,
    { key: string; sectionId: number | null; section: string; rows: FieldCompareRow[] }
  >();
  for (const row of rows) {
    const key = String(row.sectionId ?? "none");
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    groups.set(key, {
      key,
      sectionId: row.sectionId,
      section: row.section ?? "Unsectioned",
      rows: [row],
    });
  }
  return [...groups.values()].sort((left, right) => bySectionId(left.sectionId, right.sectionId));
}

function bySectionId(left: number | null | undefined, right: number | null | undefined): number {
  return (left ?? Number.MAX_SAFE_INTEGER) - (right ?? Number.MAX_SAFE_INTEGER);
}

function countryLabel(row: FieldCatalogRow | null | undefined): string {
  if (!row || row.countryId == null || row.countryId === 0) {
    return "All";
  }
  return row.countryName ?? String(row.countryId);
}

function persistPath(row: FieldCatalogRow): string {
  if (!row.dbTable && !row.dbColumn) {
    return "—";
  }
  return [row.dbTable, row.dbColumn].filter(Boolean).join(".");
}

function pair(employer: string | null | undefined, template: string | null | undefined): string {
  const left = employer?.trim() || "—";
  const right = template?.trim() || "—";
  if (left === right) {
    return left;
  }
  return `${left} → ${right}`;
}

function flagLabel(value: unknown): string {
  if (value == null) {
    return "—";
  }
  return asFlag(value) ? "Yes" : "No";
}

function asFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}

function entityColor(entity: string): string | undefined {
  switch (entity.toLowerCase()) {
    case "system":
      return "blue";
    case "country":
      return "gold";
    case "custom":
      return "purple";
    case "segment":
      return "cyan";
    default:
      return undefined;
  }
}
