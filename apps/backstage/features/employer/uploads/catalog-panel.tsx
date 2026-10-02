"use client";

import { useState } from "react";
import { Button, Card, Descriptions, Drawer, Space, Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import Link from "next/link";
import { ValidationRuleViewCell } from "@/features/employer/fields/validation-rule-cell";
import { uploadsHref } from "@/features/employer/uploads/uploads-source";
import type {
  UploadCatalog,
  UploadCatalogField,
  UploadCatalogSection,
} from "@/features/employer/uploads/queries";

export function CatalogPanel({
  catalog,
  employerId,
  selectedSectionId,
  queryScript,
}: {
  catalog: UploadCatalog;
  employerId: number;
  selectedSectionId: number | null;
  queryScript: string;
}): React.JSX.Element {
  const selected =
    catalog.sections.find((section) => section.sectionId === selectedSectionId) ??
    catalog.sections[0] ??
    null;
  const fields = selected
    ? catalog.fields.filter((field) => field.sectionId === selected.sectionId)
    : catalog.fields;
  const [field, setField] = useState<UploadCatalogField | null>(null);

  return (
    <>
      <Card className="mb-4" title="Sections for this upload type">
        <DataTable
          queryScript={queryScript}
          rowKey="sectionId"
          dataSource={catalog.sections}
          size="small"
          pagination={false}
          rowClassName={(row) =>
            selected && row.sectionId === selected.sectionId ? "bg-slate-50" : ""
          }
          locale={{ emptyText: "No sections are configured for this upload type." }}
          columns={[
            {
              title: "Section",
              dataIndex: "section",
              render: (name: string, row: UploadCatalogSection) => (
                <Link
                  href={uploadsHref(employerId, {
                    view: "catalog",
                    type: catalog.type,
                    countryId: catalog.countryId,
                    sectionId: row.sectionId,
                  })}
                >
                  {name}
                </Link>
              ),
            },
            { title: "SectionID", dataIndex: "sectionId", width: 110 },
            { title: "Fields", dataIndex: "fieldCount", width: 90 },
            { title: "DML", dataIndex: "dmlAllowed", width: 90, render: dash },
            {
              title: "History table",
              dataIndex: "historyTable",
              render: dash,
            },
          ]}
        />
      </Card>
      <Card
        title={
          selected
            ? `Fields in ${selected.section} (${fields.length})`
            : "Select a section to see its fields"
        }
      >
        <DataTable
          queryScript={queryScript}
          rowKey={(row) => `${row.sectionId}-${row.fieldId}-${row.fieldName ?? ""}`}
          dataSource={fields}
          size="small"
          scroll={{ x: "max-content" }}
          pagination={
            fields.length > 20
              ? {
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} fields`,
                }
              : false
          }
          locale={{ emptyText: "No fields match this upload type and country." }}
          columns={[
            {
              title: "Excel header",
              dataIndex: "displayText",
              width: 200,
              render: (value: string | null, row: UploadCatalogField) => (
                <Button type="link" className="h-auto p-0" onClick={() => setField(row)}>
                  {value ?? row.fieldName ?? "—"}
                </Button>
              ),
            },
            { title: "FieldName", dataIndex: "fieldName", width: 180, render: dash },
            { title: "Type", dataIndex: "fieldType", width: 140, render: dash },
            {
              title: "Rules",
              dataIndex: "validationRuleNames",
              width: 220,
              render: (names: string[]) =>
                names.length > 0
                  ? names.map((name) => <Tag key={name}>{name}</Tag>)
                  : "—",
            },
            {
              title: "Persist",
              key: "persist",
              width: 220,
              render: (_: unknown, row: UploadCatalogField) => persistPath(row),
            },
            {
              title: "Mandatory",
              dataIndex: "isMandatory",
              width: 110,
              render: (value: unknown) => <FlagTag value={value} />,
            },
            {
              title: "Validate",
              dataIndex: "isValidate",
              width: 100,
              render: (value: unknown) => <FlagTag value={value} />,
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
          ]}
        />
      </Card>
      <FieldDrawer
        employerId={employerId}
        field={field}
        onClose={() => {
          setField(null);
        }}
      />
    </>
  );
}

function FieldDrawer({
  employerId,
  field,
  onClose,
}: {
  employerId: number;
  field: UploadCatalogField | null;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Drawer
      open={field != null}
      title={field?.displayText ?? field?.fieldName ?? "Field"}
      size={520}
      onClose={onClose}
    >
      {field ? (
        <Space orientation="vertical" className="w-full" size="large">
          <Descriptions
            bordered
            column={1}
            size="small"
            items={[
              { key: "fieldId", label: "FieldID", children: field.fieldId },
              { key: "fieldName", label: "FieldName", children: field.fieldName ?? "—" },
              {
                key: "displayText",
                label: "Excel header",
                children: field.displayText ?? "—",
              },
              { key: "section", label: "Section", children: field.section },
              { key: "type", label: "FieldType", children: field.fieldType ?? "—" },
              { key: "entity", label: "FieldEntity", children: field.fieldEntity ?? "—" },
              { key: "persist", label: "DB target", children: persistPath(field) },
              {
                key: "country",
                label: "Country",
                children:
                  field.countryId && field.countryId !== 0
                    ? (field.countryName ?? String(field.countryId))
                    : "All",
              },
            ]}
          />
          <div>
            <div className="mb-2 text-sm font-medium">ValidationRule</div>
            <ValidationRuleViewCell
              label={`ValidationRule: ${field.fieldName ?? "field"}`}
              value={field.validationRule}
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Lookup SQL / options</div>
            <ValidationRuleViewCell
              label="FieldType_JSON_SQL"
              value={field.fieldTypeJsonSql}
            />
          </div>
          <Link href={`/employers/${employerId}/fields`}>Open Fields catalog</Link>
        </Space>
      ) : null}
    </Drawer>
  );
}

function FlagTag({ value }: { value: unknown }): React.JSX.Element {
  return asFlag(value) ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>;
}

function persistPath(row: UploadCatalogField): string {
  if (!row.dbTable && !row.dbColumn) {
    return "—";
  }
  return [row.dbTable, row.dbColumn].filter(Boolean).join(".");
}

function dash(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

function asFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}
