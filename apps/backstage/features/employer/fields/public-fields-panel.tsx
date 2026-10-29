"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Collapse, Pagination, Switch, Tag, Tooltip } from "antd";
import { useRouter } from "next/navigation";
import { FieldListSearch } from "@/features/employer/fields/fields-panel";
import {
  isLockedPublicFieldName,
  LOCKED_PUBLIC_FIELD_REASON,
} from "@hrms/db/public-fields";
import { fieldsHref } from "@/features/employer/fields/fields-source";
import {
  commitClearPublicField,
  previewClearPublicField,
} from "@/features/employer/fields/mutations";
import type { PublicFieldRow } from "@/features/employer/fields/queries";
import { namesMatch } from "@/shared/entity-link";
import { ConfirmWriteModal, DataTable } from "@/shared/ui";

export function PublicFieldsPanel({
  employerId,
  fields,
  section,
  field,
  writesEnabled,
  queryScript,
  listPage,
  listSearch,
  pageSize,
  totalCount,
}: {
  employerId: number;
  fields: PublicFieldRow[];
  section: string | null;
  field: string | null;
  writesEnabled: boolean;
  queryScript: string;
  listPage: number;
  listSearch: string;
  pageSize: number;
  totalCount: number;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState<PublicFieldRow | null>(null);
  const sectionKnown = (() => {
    if (!section) {
      return false;
    }
    return fields.some((row) => namesMatch(row.section, section));
  })();
  const visible = (() => {
    if (!section || !sectionKnown) {
      return fields;
    }
    return fields.filter((row) => namesMatch(row.section, section));
  })();
  const highlightField = sectionKnown ? field : null;
  const sections = groupBySection(visible);

  useEffect(() => {
    if (!highlightField || !sectionKnown) {
      return;
    }
    document.getElementById("field-focus")?.scrollIntoView({ block: "center" });
  }, [highlightField, sectionKnown]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {section ? (
          <Button
            type="link"
            onClick={() => {
              router.push(fieldsHref(employerId, { source: "public" }));
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
      <div className="mb-4">
        <FieldListSearch
          initialQuery={listSearch}
          onSearch={(next) => {
            router.push(
              fieldsHref(employerId, {
                source: "public",
                section,
                field,
                q: next || null,
              }),
            );
          }}
        />
      </div>
      <p className="mb-3 text-slate-600">
        {totalCount} public {totalCount === 1 ? "field" : "fields"}
      </p>
      {sections.length === 0 ? (
        <p className="text-slate-500">No public fields.</p>
      ) : (
        <Collapse
          defaultActiveKey={sectionKnown ? sections.map((item) => item.key) : undefined}
          items={sections.map((item) => ({
            key: item.key,
            label: `${item.section} (${item.fields.length})`,
            children: (
              <PublicFieldsTable
                fields={item.fields}
                highlightField={highlightField}
                queryScript={queryScript}
                writesEnabled={writesEnabled}
                onTurnOff={setPending}
              />
            ),
          }))}
        />
      )}
      <Pagination
        className="mt-4"
        current={listPage}
        pageSize={pageSize > 0 ? pageSize : 50}
        showSizeChanger={false}
        total={totalCount}
        onChange={(next) => {
          router.push(
            fieldsHref(employerId, {
              source: "public",
              section,
              field,
              q: listSearch || null,
              page: next,
            }),
          );
        }}
      />
      <ConfirmWriteModal
        hideTrigger
        open={pending != null}
        title={pending?.fieldName ? `Turn off ${pending.fieldName}` : "Turn off public field"}
        buttonLabel="Turn off"
        previewAction={() => {
          if (!pending) {
            throw new Error("Field was not found for this employer.");
          }
          return previewClearPublicField({
            employerId,
            fieldId: pending.fieldId,
          });
        }}
        commitAction={commitClearPublicField}
        successMessage="Field is no longer public."
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
          }
        }}
        onDone={() => {
          router.refresh();
        }}
      />
    </>
  );
}

function PublicFieldsTable({
  fields,
  highlightField,
  queryScript,
  writesEnabled,
  onTurnOff,
}: {
  fields: PublicFieldRow[];
  highlightField: string | null;
  queryScript: string;
  writesEnabled: boolean;
  onTurnOff: (row: PublicFieldRow) => void;
}): React.JSX.Element {
  return (
    <DataTable<PublicFieldRow>
      queryScript={queryScript}
      rowKey="fieldId"
      dataSource={fields}
      pagination={false}
      scroll={{ x: "max-content" }}
      size="small"
      columns={[
        { title: "Field name", dataIndex: "fieldName", width: 220 },
        { title: "Display text", dataIndex: "displayText", width: 220 },
        {
          title: "Country",
          key: "country",
          width: 140,
          render: (_value: unknown, row: PublicFieldRow) => countryLabel(row),
        },
        {
          title: "Field entity",
          dataIndex: "fieldEntity",
          width: 140,
          render: (value: unknown) => {
            const entity = typeof value === "string" ? value.trim() : "";
            return entity === "" ? "—" : <Tag color={entityColor(entity)}>{entity}</Tag>;
          },
        },
        {
          title: "Hidden",
          dataIndex: "isHidden",
          width: 100,
          render: (value: unknown) =>
            asFlag(value) ? <Tag>Hidden</Tag> : "—",
        },
        {
          title: "Public",
          key: "public",
          width: 180,
          render: (_value: unknown, row: PublicFieldRow) => (
            <PublicSwitch
              row={row}
              writesEnabled={writesEnabled}
              onTurnOff={onTurnOff}
            />
          ),
        },
      ]}
      onRow={(row) =>
        namesMatch(row.fieldName, highlightField) ? { id: "field-focus" } : {}
      }
      rowClassName={(row) =>
        namesMatch(row.fieldName, highlightField) ? "bg-amber-50" : ""
      }
    />
  );
}

function PublicSwitch({
  row,
  writesEnabled,
  onTurnOff,
}: {
  row: PublicFieldRow;
  writesEnabled: boolean;
  onTurnOff: (row: PublicFieldRow) => void;
}): React.JSX.Element {
  const locked = isLockedPublicFieldName(row.fieldName);
  const disabled = locked || !writesEnabled;
  const reason = locked
    ? LOCKED_PUBLIC_FIELD_REASON
    : writesEnabled
      ? undefined
      : "Writes are disabled.";
  const control = (
    <Switch
      checked
      disabled={disabled}
      size="small"
      onChange={(checked) => {
        if (!checked) {
          onTurnOff(row);
        }
      }}
    />
  );
  return (
    <span className="inline-flex items-center gap-2">
      {reason ? (
        <Tooltip title={reason}>
          <span>{control}</span>
        </Tooltip>
      ) : (
        control
      )}
      {locked ? <span className="text-slate-500">Stays public</span> : null}
    </span>
  );
}

function groupBySection(fields: PublicFieldRow[]): Array<{
  key: string;
  sectionId: number | null;
  section: string;
  fields: PublicFieldRow[];
}> {
  const groups = new Map<
    string,
    { key: string; sectionId: number | null; section: string; fields: PublicFieldRow[] }
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
  return [...groups.values()].sort(
    (left, right) =>
      (left.sectionId ?? Number.MAX_SAFE_INTEGER) -
      (right.sectionId ?? Number.MAX_SAFE_INTEGER),
  );
}

function countryLabel(row: PublicFieldRow): string {
  if (row.countryId == null || row.countryId === 0) {
    return "All";
  }
  return row.countryName ?? String(row.countryId);
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

function asFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}
