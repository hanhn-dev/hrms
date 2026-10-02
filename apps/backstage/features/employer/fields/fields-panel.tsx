"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Collapse, Input, Select, Tabs, Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import { useRouter } from "next/navigation";
import { fieldsHref, type FieldSource } from "@/features/employer/fields/fields-source";
import {
  commitUpdateFieldRow,
  previewUpdateFieldRow,
} from "@/features/employer/fields/mutations";
import type {
  FieldCatalogRow,
  FieldCompareRow,
  FieldCompareStatus,
  FieldTypeOption,
} from "@/features/employer/fields/queries";
import {
  ValidationRuleCell,
  ValidationRuleViewCell,
} from "@/features/employer/fields/validation-rule-cell";
import { namesMatch } from "@/shared/entity-link";
import { EditableTable, type EditableColumn } from "@/shared/ui";

const DEFAULT_ENTITIES = ["System", "Country", "Custom"];
const KNOWN_ENTITIES = [
  "System",
  "Country",
  "Custom",
  "Segment",
  "BulkCreation",
];

export function FieldsTabBar({
  source,
  employerId,
  section,
  field,
  children,
}: {
  source: FieldSource;
  employerId: number;
  section: string | null;
  field: string | null;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <Tabs
      activeKey={source}
      onChange={(next) => {
        router.push(
          fieldsHref(employerId, {
            source: next as FieldSource,
            section,
            field,
          }),
        );
      }}
      items={[
        {
          key: "employer",
          label: "Employer fields",
          children: source === "employer" ? children : null,
        },
        {
          key: "template",
          label: "Template",
          children: source === "template" ? children : null,
        },
        {
          key: "compare",
          label: "Compare",
          children: source === "compare" ? children : null,
        },
      ]}
    />
  );
}

export function FieldsPanel({
  employerFields,
  templateFields,
  compared,
  source,
  employerId,
  fieldTypes,
  writesEnabled,
  section,
  field,
  employerScript,
  templateScript,
  compareScript,
}: {
  employerFields: FieldCatalogRow[];
  templateFields: FieldCatalogRow[];
  compared: FieldCompareRow[];
  source: FieldSource;
  employerId: number;
  fieldTypes: FieldTypeOption[];
  writesEnabled: boolean;
  section: string | null;
  field: string | null;
  employerScript: string;
  templateScript: string;
  compareScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const sectionKnown = useMemo(() => {
    if (!section) {
      return false;
    }
    return [...employerFields, ...templateFields, ...compared].some((row) =>
      namesMatch(row.section, section),
    );
  }, [compared, employerFields, section, templateFields]);
  const scopedEmployer = useMemo(
    () => scopeRows(employerFields, section, sectionKnown),
    [employerFields, section, sectionKnown],
  );
  const scopedTemplate = useMemo(
    () => scopeRows(templateFields, section, sectionKnown),
    [section, sectionKnown, templateFields],
  );
  const scopedCompared = useMemo(
    () => scopeCompareRows(compared, section, sectionKnown),
    [compared, section, sectionKnown],
  );
  const [entities, setEntities] = useState<string[]>(() =>
    initialEntities(employerFields, templateFields, section, sectionKnown),
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!field || !sectionKnown) {
      return;
    }
    document.getElementById("field-focus")?.scrollIntoView({ block: "center" });
  }, [field, sectionKnown, source]);

  const entityOptions = useMemo(
    () => entityFilterOptions(employerFields, templateFields),
    [employerFields, templateFields],
  );

  const visibleEmployer = useMemo(
    () => filterCatalogRows(scopedEmployer, entities, search),
    [entities, scopedEmployer, search],
  );
  const visibleTemplate = useMemo(
    () => filterCatalogRows(scopedTemplate, entities, search),
    [entities, scopedTemplate, search],
  );
  const visibleCompared = useMemo(
    () => filterCompareRows(scopedCompared, entities, search),
    [entities, scopedCompared, search],
  );
  const highlightField = sectionKnown ? field : null;

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
        {section ? (
          <Button
            type="link"
            onClick={() => {
              router.push(fieldsHref(employerId, { source }));
            }}
          >
            All sections
          </Button>
        ) : null}
      </div>
      {section && !sectionKnown ? (
        <Alert
          className="mb-4"
          showIcon
          type="info"
          title={`No section named ${section}.`}
        />
      ) : null}
      {section && sectionKnown ? (
        <Alert
          className="mb-4"
          showIcon
          type="info"
          title={`Section: ${section}${highlightField ? ` · ${highlightField}` : ""}`}
        />
      ) : null}
      {source === "employer" ? (
        <>
          <p className="mb-3 text-slate-600">{visibleEmployer.length} fields</p>
          <SectionedFields
          emptyText="No employer fields match the current filters."
          employerId={employerId}
          fieldTypes={fieldTypes}
          fields={visibleEmployer}
          highlightField={highlightField}
          openSections={sectionKnown}
          pinFocus
          queryScript={employerScript}
          writesEnabled={writesEnabled}
        />
        </>
      ) : null}
      {source === "template" ? (
        <>
          <p className="mb-3 text-slate-600">{visibleTemplate.length} fields</p>
          <SectionedFields
          emptyText="No template fields match the current filters."
          fields={visibleTemplate}
          highlightField={highlightField}
          openSections={sectionKnown}
          pinFocus
          queryScript={templateScript}
        />
        </>
      ) : null}
      {source === "compare" ? (
        <>
          <p className="mb-3 text-slate-600">{visibleCompared.length} differences</p>
          <SectionedCompare
            emptyText="No template vs employer differences match the current filters."
            highlightField={highlightField}
            openSections={sectionKnown}
            pinFocus
            queryScript={compareScript}
            rows={visibleCompared}
          />
        </>
      ) : null}
    </>
  );
}

function SectionedFields({
  fields,
  emptyText,
  employerId,
  fieldTypes,
  writesEnabled,
  highlightField,
  openSections,
  pinFocus,
  queryScript,
}: {
  fields: FieldCatalogRow[];
  emptyText: string;
  employerId?: number;
  fieldTypes?: FieldTypeOption[];
  writesEnabled?: boolean;
  highlightField: string | null;
  openSections: boolean;
  pinFocus: boolean;
  queryScript: string;
}): React.JSX.Element {
  const sections = groupBySection(fields);
  if (sections.length === 0) {
    return <p className="text-slate-500">{emptyText}</p>;
  }
  return (
    <Collapse
      defaultActiveKey={openSections ? sections.map((section) => section.key) : undefined}
      items={sections.map((section) => ({
        key: section.key,
        label: `${section.section} (${section.fields.length})`,
        children: (
          <FieldsTable
            employerId={employerId}
            fieldTypes={fieldTypes}
            fields={section.fields}
            highlightField={highlightField}
            pinFocus={pinFocus}
            queryScript={queryScript}
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
  highlightField,
  openSections,
  pinFocus,
  queryScript,
}: {
  rows: FieldCompareRow[];
  emptyText: string;
  highlightField: string | null;
  openSections: boolean;
  pinFocus: boolean;
  queryScript: string;
}): React.JSX.Element {
  const sections = groupCompareBySection(rows);
  if (sections.length === 0) {
    return <p className="text-slate-500">{emptyText}</p>;
  }
  return (
    <Collapse
      defaultActiveKey={openSections ? sections.map((section) => section.key) : undefined}
      items={sections.map((section) => ({
        key: section.key,
        label: `${section.section} (${section.rows.length})`,
        children: (
          <CompareTable
            highlightField={highlightField}
            pinFocus={pinFocus}
            queryScript={queryScript}
            rows={section.rows}
          />
        ),
      }))}
    />
  );
}

function FieldsTable({
  fields,
  employerId,
  fieldTypes = [],
  writesEnabled,
  highlightField,
  pinFocus,
  queryScript,
}: {
  fields: FieldCatalogRow[];
  employerId?: number;
  fieldTypes?: FieldTypeOption[];
  writesEnabled?: boolean;
  highlightField: string | null;
  pinFocus: boolean;
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const entityOptions = entitySelectOptions(fields);
  const typeOptions = fieldTypeSelectOptions(fieldTypes, fields);
  const columns: Array<EditableColumn<FieldCatalogRow>> = [
    {
      title: "FieldName",
      dataIndex: "fieldName",
      width: 180,
      editable: true,
      required: true,
      editorProps: { maxLength: 255 },
    },
    {
      title: "DisplayText",
      dataIndex: "displayText",
      width: 200,
      editable: true,
      required: true,
      editorProps: { maxLength: 255 },
    },
    {
      title: "FieldEntity",
      dataIndex: "fieldEntity",
      width: 130,
      editable: true,
      editor: "select",
      required: true,
      editorProps: { options: entityOptions },
      render: (value: string | null) => <EntityTag entity={value} />,
    },
    {
      title: "FieldType",
      dataIndex: "fieldType",
      formItemName: "fieldTypeId",
      width: 150,
      editable: true,
      editor: "select",
      required: true,
      editorProps: { options: typeOptions },
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "IsMandatory",
      dataIndex: "isMandatory",
      width: 120,
      editable: (row) => !asFlag(row.isDefault),
      editor: "switch",
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
      editable: true,
      editor: "switch",
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
      editable: true,
      editor: "switch",
      render: (value: unknown) => <FlagTag value={value} />,
    },
    {
      title: "Active",
      dataIndex: "isActive",
      width: 90,
      editable: true,
      editor: "switch",
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
  ];

  return (
    <EditableTable<FieldCatalogRow>
      queryScript={queryScript}
      rowKey="fieldId"
      columns={columns}
      confirmWrite={
        employerId == null
          ? undefined
          : {
              title: (row) =>
                row.fieldName ? `Update ${row.fieldName}` : "Update field",
              previewAction: (row, values) =>
                previewUpdateFieldRow({
                  employerId,
                  fieldId: row.fieldId,
                  values,
                }),
              commitAction: commitUpdateFieldRow,
              successMessage: "Field updated.",
              onDone: () => {
                router.refresh();
              },
            }
      }
      dataSource={fields}
      onRow={(row) =>
        pinFocus && namesMatch(row.fieldName, highlightField) ? { id: "field-focus" } : {}
      }
      pagination={
        fields.length > 20
          ? {
              defaultCurrent: pageForField(fields, highlightField),
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${total} fields`,
            }
          : false
      }
      rowClassName={(row) =>
        namesMatch(row.fieldName, highlightField) ? "bg-amber-50" : ""
      }
      scroll={{ x: "max-content" }}
      size="small"
      writesEnabled={employerId != null && writesEnabled === true}
    />
  );
}

function CompareTable({
  rows,
  highlightField,
  pinFocus,
  queryScript,
}: {
  rows: FieldCompareRow[];
  highlightField: string | null;
  pinFocus: boolean;
  queryScript: string;
}): React.JSX.Element {
  return (
    <DataTable
      queryScript={queryScript}
      rowKey="key"
      dataSource={rows}
      size="small"
      scroll={{ x: "max-content" }}
      onRow={(row) =>
        pinFocus && namesMatch(row.fieldName, highlightField) ? { id: "field-focus" } : {}
      }
      rowClassName={(row) =>
        namesMatch(row.fieldName, highlightField) ? "bg-amber-50" : ""
      }
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

function scopeRows(
  rows: FieldCatalogRow[],
  section: string | null,
  sectionKnown: boolean,
): FieldCatalogRow[] {
  if (!section || !sectionKnown) {
    return rows;
  }
  return rows.filter((row) => namesMatch(row.section, section));
}

function scopeCompareRows(
  rows: FieldCompareRow[],
  section: string | null,
  sectionKnown: boolean,
): FieldCompareRow[] {
  if (!section || !sectionKnown) {
    return rows;
  }
  return rows.filter((row) => namesMatch(row.section, section));
}

function initialEntities(
  employerFields: FieldCatalogRow[],
  templateFields: FieldCatalogRow[],
  section: string | null,
  sectionKnown: boolean,
): string[] {
  if (!section || !sectionKnown) {
    return DEFAULT_ENTITIES;
  }
  const names = new Set<string>();
  for (const row of [...employerFields, ...templateFields]) {
    if (!namesMatch(row.section, section)) {
      continue;
    }
    const entity = row.fieldEntity?.trim();
    if (entity) {
      names.add(entity);
    }
  }
  return names.size > 0 ? [...names] : DEFAULT_ENTITIES;
}

function pageForField(fields: FieldCatalogRow[], highlightField: string | null): number {
  const index = fields.findIndex((row) => namesMatch(row.fieldName, highlightField));
  if (index < 0) {
    return 1;
  }
  return Math.floor(index / 20) + 1;
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

function entitySelectOptions(
  fields: FieldCatalogRow[],
): Array<{ label: string; value: string }> {
  const seen = new Map<string, string>();
  for (const name of KNOWN_ENTITIES) {
    seen.set(name.toLowerCase(), name);
  }
  for (const row of fields) {
    const entity = row.fieldEntity?.trim();
    if (entity && !seen.has(entity.toLowerCase())) {
      seen.set(entity.toLowerCase(), entity);
    }
  }
  return [...seen.values()].map((value) => ({ label: value, value }));
}

function fieldTypeSelectOptions(
  fieldTypes: FieldTypeOption[],
  fields: FieldCatalogRow[],
): Array<{ label: string; value: number }> {
  const seen = new Map<number, { label: string; value: number }>();
  for (const type of fieldTypes) {
    seen.set(type.fieldTypeId, {
      label: type.fieldType,
      value: type.fieldTypeId,
    });
  }
  for (const row of fields) {
    if (row.fieldTypeId == null || seen.has(row.fieldTypeId)) {
      continue;
    }
    seen.set(row.fieldTypeId, {
      label: row.fieldType?.trim() || String(row.fieldTypeId),
      value: row.fieldTypeId,
    });
  }
  return [...seen.values()];
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
