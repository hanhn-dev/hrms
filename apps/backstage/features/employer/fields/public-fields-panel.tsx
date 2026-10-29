"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Spin, Switch, Tag, Tooltip } from "antd";
import type { FieldSectionSummary } from "@hrms/db";
import { useRouter } from "next/navigation";
import { FieldListSearch } from "@/features/employer/fields/fields-panel";
import {
  SectionAccordion,
  SectionPageLoader,
} from "@/features/employer/fields/section-accordion";
import { loadPublicSectionFields } from "@/features/employer/fields/section-actions";
import {
  fieldLinkOpenKey,
  fieldSectionTotal,
  sectionAccordionKey,
  sectionTablePagination,
} from "@/features/employer/fields/section-list";
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
  fieldSections,
  section,
  field,
  writesEnabled,
  listSearch,
}: {
  employerId: number;
  fieldSections: FieldSectionSummary[];
  section: string | null;
  field: string | null;
  writesEnabled: boolean;
  listSearch: string;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState<PublicFieldRow | null>(null);
  const [pageRevision, setPageRevision] = useState(0);
  const sectionKnown =
    Boolean(section) && fieldSections.some((item) => namesMatch(item.section, section));
  const highlightField = sectionKnown ? field : null;
  const listKey = `${listSearch}|${section ?? ""}`;
  const [seenListKey, setSeenListKey] = useState(listKey);
  const [honorFieldLink, setHonorFieldLink] = useState(true);
  if (seenListKey !== listKey) {
    setSeenListKey(listKey);
    setHonorFieldLink(false);
  }
  const focusedSection = fieldSections.find((item) => namesMatch(item.section, section));
  const initialOpenKey = fieldLinkOpenKey(
    honorFieldLink && Boolean(field),
    focusedSection?.sectionId ?? null,
    focusedSection != null,
  );
  const totalCount = fieldSectionTotal(fieldSections);

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
      <SectionAccordion
        key={listKey}
        emptyText="No public fields."
        initialOpenKey={initialOpenKey}
        sections={fieldSections}
        renderPanel={(item) => (
          <SectionPageLoader
            focusField={
              initialOpenKey != null && sectionAccordionKey(item.sectionId) === initialOpenKey
                ? field
                : null
            }
            revision={pageRevision}
            onLoaded={() => {
              setHonorFieldLink(false);
            }}
            load={(request) =>
              loadPublicSectionFields({
                employerId,
                section: item.section,
                q: listSearch,
                page: request.page,
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
                <PublicFieldsTable
                  fields={result.rows}
                  highlightField={namesMatch(item.section, section) ? highlightField : null}
                  loading={loading}
                  pagination={sectionTablePagination(result, onPage)}
                  queryScript={result.script}
                  writesEnabled={writesEnabled}
                  onTurnOff={setPending}
                />
              );
            }}
          </SectionPageLoader>
        )}
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
          setPageRevision((current) => current + 1);
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
  loading = false,
  pagination = false,
  onTurnOff,
}: {
  fields: PublicFieldRow[];
  highlightField: string | null;
  queryScript: string;
  writesEnabled: boolean;
  loading?: boolean;
  pagination?: false | {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger: false;
    onChange: (page: number) => void;
  };
  onTurnOff: (row: PublicFieldRow) => void;
}): React.JSX.Element {
  useEffect(() => {
    if (!highlightField) {
      return;
    }
    document.getElementById("field-focus")?.scrollIntoView({ block: "center" });
  }, [fields, highlightField]);
  return (
    <DataTable<PublicFieldRow>
      queryScript={queryScript}
      rowKey="fieldId"
      dataSource={fields}
      loading={loading}
      pagination={pagination}
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
