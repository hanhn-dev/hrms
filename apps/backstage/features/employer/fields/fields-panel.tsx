"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Alert, Button, Collapse, Input, Select, Spin, Tabs, Tag } from "antd";
import type { TablePaginationConfig } from "antd";
import type { FieldSectionSummary } from "@hrms/db";
import { DataTable } from "@/shared/ui/data-table";
import { useRouter } from "next/navigation";
import { fieldsHref, type FieldSource } from "@/features/employer/fields/fields-source";
import {
  SectionAccordion,
  SectionPageLoader,
} from "@/features/employer/fields/section-accordion";
import {
  loadEmployerFieldSections,
  loadEmployerSectionFields,
  loadTemplateFieldSections,
  loadTemplateSectionFields,
} from "@/features/employer/fields/section-actions";
import {
  DEFAULT_FIELD_ENTITIES,
  fieldLinkOpenKey,
  fieldSectionTotal,
  sameEntitySelection,
  sectionAccordionKey,
  sectionTablePagination,
} from "@/features/employer/fields/section-list";
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
  COMPARE_FIELD_TABLE_TITLES,
  EMPLOYER_FIELD_TABLE_TITLES,
  fieldColumnTitle,
} from "@/features/employer/fields/field-table-columns";
import {
  ValidationRuleCell,
  ValidationRuleViewCell,
} from "@/features/employer/fields/validation-rule-cell";
import { namesMatch } from "@/shared/entity-link";
import { serverSearchChanged } from "@/shared/ui/data-table-search";
import { EditableTable, type EditableColumn } from "@/shared/ui";

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
  listSearch,
  children,
}: {
  source: FieldSource;
  employerId: number;
  section: string | null;
  field: string | null;
  listSearch: string;
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
            q: listSearch || null,
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
        {
          key: "public",
          label: "Public fields",
          children: source === "public" ? children : null,
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
  compareScript,
  listSearch,
  fieldSections,
  compareBounded,
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
  compareScript: string;
  listSearch: string;
  fieldSections: FieldSectionSummary[];
  compareBounded: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const compareSectionKnown = (() => {
    if (!section) {
      return false;
    }
    return [...employerFields, ...templateFields, ...compared].some((row) =>
      namesMatch(row.section, section),
    );
  })();
  const [entities, setEntities] = useState<string[]>(() =>
    source === "compare"
      ? initialEntities(employerFields, templateFields, section, compareSectionKnown)
      : [...DEFAULT_FIELD_ENTITIES],
  );
  const [customSections, setCustomSections] = useState<{
    key: string;
    rows: FieldSectionSummary[];
  } | null>(null);
  const [pageRevision, setPageRevision] = useState(0);
  const entityKey = entities.join("\0");
  const usingDefaults = sameEntitySelection(entities, DEFAULT_FIELD_ENTITIES);
  const customReady = customSections?.key === `${entityKey}|${pageRevision}`;
  const displayedSections = usingDefaults
    ? fieldSections
    : customReady
      ? customSections.rows
      : [];
  const catalogSectionKnown =
    Boolean(section) &&
    displayedSections.some((item) => namesMatch(item.section, section));
  const sectionKnown = source === "compare" ? compareSectionKnown : catalogSectionKnown;
  const sectionsReady = source === "compare" || usingDefaults || customReady;
  const listKey = `${source}|${listSearch}|${section ?? ""}|${entityKey}`;
  const [seenListKey, setSeenListKey] = useState(listKey);
  const [honorFieldLink, setHonorFieldLink] = useState(true);
  if (seenListKey !== listKey) {
    setSeenListKey(listKey);
    setHonorFieldLink(false);
  }
  const focusedSection = displayedSections.find((item) => namesMatch(item.section, section));
  const initialOpenKey = fieldLinkOpenKey(
    honorFieldLink && Boolean(field),
    focusedSection?.sectionId ?? null,
    focusedSection != null,
  );

  useEffect(() => {
    if (source !== "employer" && source !== "template") {
      return;
    }
    if (sameEntitySelection(entities, DEFAULT_FIELD_ENTITIES)) {
      return;
    }
    let cancelled = false;
    const requestKey = `${entityKey}|${pageRevision}`;
    const request =
      source === "employer"
        ? loadEmployerFieldSections({
            employerId,
            q: listSearch,
            section,
            entities,
          })
        : loadTemplateFieldSections({
            q: listSearch,
            section,
            entities,
          });
    void request
      .then((rows) => {
        if (cancelled) {
          return;
        }
        setCustomSections({ key: requestKey, rows });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setCustomSections({ key: requestKey, rows: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [source, employerId, listSearch, section, entityKey, entities, pageRevision]);

  useEffect(() => {
    if (source !== "compare" || !field || !sectionKnown) {
      return;
    }
    document.getElementById("field-focus")?.scrollIntoView({ block: "center" });
  }, [field, sectionKnown, source]);

  const entityOptions = entityFilterOptions(employerFields, templateFields);
  const scopedCompared = scopeCompareRows(compared, section, sectionKnown);
  const visibleCompared = filterCompareRows(scopedCompared, entities);
  const highlightField = sectionKnown ? field : null;
  const catalogCount = fieldSectionTotal(displayedSections);

  function refreshOpenSection(): void {
    setPageRevision((current) => current + 1);
    router.refresh();
  }

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
        <FieldListSearch
          initialQuery={listSearch}
          onSearch={(next) => {
            router.push(
              fieldsHref(employerId, {
                source,
                section,
                field,
                q: next || null,
              }),
            );
          }}
        />
        {section ? (
          <Button
            type="link"
            onClick={() => {
              router.push(fieldsHref(employerId, { source, q: listSearch || null }));
            }}
          >
            All sections
          </Button>
        ) : null}
      </div>
      {section && sectionsReady && !sectionKnown ? (
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
      {source === "employer" || source === "template" ? (
        <>
          <p className="mb-3 text-slate-600">{catalogCount} fields</p>
          {!usingDefaults && !customReady ? (
            <Spin />
          ) : (
            <SectionAccordion
              key={listKey}
              emptyText={
                source === "employer"
                  ? "No employer fields match the current filters."
                  : "No template fields match the current filters."
              }
              initialOpenKey={initialOpenKey}
              sections={displayedSections}
              renderPanel={(item) => (
                <CatalogSectionTable
                  employerId={source === "employer" ? employerId : undefined}
                  entities={entities}
                  fieldTypes={fieldTypes}
                  focusField={
                    initialOpenKey != null &&
                    sectionAccordionKey(item.sectionId) === initialOpenKey
                      ? field
                      : null
                  }
                  highlightField={
                    namesMatch(item.section, section) ? highlightField : null
                  }
                  listSearch={listSearch}
                  revision={pageRevision}
                  sectionName={item.section}
                  onFieldLinkConsumed={() => {
                    setHonorFieldLink(false);
                  }}
                  source={source}
                  writesEnabled={writesEnabled}
                  onSaved={refreshOpenSection}
                />
              )}
            />
          )}
        </>
      ) : null}
      {source === "compare" ? (
        compareBounded ? (
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
        ) : (
          <Alert
            showIcon
            type="info"
            title="Pick a section or search to compare"
            description="Compare loads the fields in that section or search on both sides. It does not download every employer field and every template field first."
          />
        )
      ) : null}
    </>
  );
}

function CatalogSectionTable({
  source,
  sectionName,
  employerId,
  fieldTypes,
  writesEnabled,
  entities,
  listSearch,
  focusField,
  highlightField,
  revision,
  onSaved,
  onFieldLinkConsumed,
}: {
  source: "employer" | "template";
  sectionName: string;
  employerId?: number;
  fieldTypes: FieldTypeOption[];
  writesEnabled: boolean;
  entities: string[];
  listSearch: string;
  focusField: string | null;
  highlightField: string | null;
  revision: number;
  onSaved: () => void;
  onFieldLinkConsumed: () => void;
}): React.JSX.Element {
  return (
    <SectionPageLoader
      focusField={focusField}
      revision={revision}
      onLoaded={onFieldLinkConsumed}
      load={(request) =>
        source === "employer"
          ? loadEmployerSectionFields({
              employerId: employerId ?? 0,
              section: sectionName,
              q: listSearch,
              entities,
              page: request.page,
              pageSize: request.pageSize,
              focusField: request.focusField,
            })
          : loadTemplateSectionFields({
              section: sectionName,
              q: listSearch,
              entities,
              page: request.page,
              pageSize: request.pageSize,
              focusField: request.focusField,
            })
      }
    >
      {({ result, loading, error, onPage }) => {
        if (error) {
          return <Alert showIcon type="error" title={error} />;
        }
        if (!result) {
          return <Spin />;
        }
        return (
          <FieldsTable
            employerId={employerId}
            fieldTypes={fieldTypes}
            fields={result.rows}
            highlightField={highlightField}
            loading={loading}
            pagination={sectionTablePagination(result, onPage)}
            pinFocus
            queryScript={result.script}
            writesEnabled={writesEnabled}
            onSaved={onSaved}
          />
        );
      }}
    </SectionPageLoader>
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
  pagination = false,
  loading = false,
  onSaved,
}: {
  fields: FieldCatalogRow[];
  employerId?: number;
  fieldTypes?: FieldTypeOption[];
  writesEnabled?: boolean;
  highlightField: string | null;
  pinFocus: boolean;
  queryScript: string;
  pagination?: TablePaginationConfig | false;
  loading?: boolean;
  onSaved?: () => void;
}): React.JSX.Element {
  useEffect(() => {
    if (!pinFocus || !highlightField) {
      return;
    }
    document.getElementById("field-focus")?.scrollIntoView({ block: "center" });
  }, [fields, highlightField, pinFocus]);
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
      title: fieldColumnTitle(EMPLOYER_FIELD_TABLE_TITLES, "FieldType_JSON_SQL"),
      dataIndex: "fieldTypeJsonSql",
      width: 220,
      render: (value: string | null, row: FieldCatalogRow) => (
        <ValidationRuleViewCell
          label={
            row.fieldName
              ? `FieldType_JSON_SQL: ${row.fieldName}`
              : "FieldType_JSON_SQL"
          }
          value={value}
        />
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
                onSaved?.();
              },
            }
      }
      dataSource={fields}
      loading={loading}
      onRow={(row) =>
        pinFocus && namesMatch(row.fieldName, highlightField) ? { id: "field-focus" } : {}
      }
      pagination={pagination}
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
          title: fieldColumnTitle(COMPARE_FIELD_TABLE_TITLES, "FieldType_JSON_SQL"),
          key: "fieldTypeJsonSql",
          width: 260,
          render: (_: unknown, row: FieldCompareRow) => {
            const left = row.employer?.fieldTypeJsonSql ?? null;
            const right = row.template?.fieldTypeJsonSql ?? null;
            if ((left ?? "") === (right ?? "")) {
              return (
                <ValidationRuleViewCell label="FieldType_JSON_SQL" value={left} />
              );
            }
            return (
              <div className="flex items-center gap-1">
                <ValidationRuleViewCell
                  label="Employer FieldType_JSON_SQL"
                  value={left}
                />
                <span>→</span>
                <ValidationRuleViewCell
                  label="Template FieldType_JSON_SQL"
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
    return [...DEFAULT_FIELD_ENTITIES];
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
  return names.size > 0 ? [...names] : [...DEFAULT_FIELD_ENTITIES];
}

function filterCompareRows(rows: FieldCompareRow[], entities: string[]): FieldCompareRow[] {
  const selected = new Set(entities.map((entity) => entity.toLowerCase()));
  return rows.filter((row) => selected.has((row.fieldEntity ?? "").trim().toLowerCase()));
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

export function FieldListSearch({
  initialQuery,
  onSearch,
}: {
  initialQuery: string;
  onSearch: (query: string) => void;
}): React.JSX.Element {
  const [value, setValue] = useState(initialQuery);
  const [seenQuery, setSeenQuery] = useState(initialQuery);
  if (seenQuery !== initialQuery) {
    setSeenQuery(initialQuery);
    setValue(initialQuery);
  }
  const emit = useEffectEvent(onSearch);
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = serverSearchChanged(value, initialQuery);
      if (next != null) {
        emit(next);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [value, initialQuery]);
  return (
    <Input.Search
      allowClear
      className="max-w-xs"
      placeholder="Search fields"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
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
