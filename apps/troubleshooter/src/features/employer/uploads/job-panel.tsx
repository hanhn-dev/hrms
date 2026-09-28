"use client";

import { Alert, Button, Card, Descriptions, Listy, Modal, Segmented, Table, Tag } from "antd";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { getEmployeeAccess } from "@/features/employee/access/queries";
import type { EmployeeLoginInfo, EmployeeProfile, FailedLoginAttempt } from "@hrms/db";
import { ValidationRuleViewCell } from "@/features/employer/fields/validation-rule-cell";
import { StatusTag } from "@/features/employer/uploads/jobs-table";
import { UploadEmployeeModal } from "@/features/employer/uploads/upload-employee-modal";
import { uploadDetailHref } from "@/features/employer/uploads/uploads-source";
import type {
  CreationFinalize,
  CreationStagingRow,
  CreationStagingSummary,
  UploadBatchDetail,
  UploadBatchRow,
  UploadCatalog,
  UploadDetail,
  UploadErrorClass,
  UploadExecutionError,
  UploadHeaderMismatch,
  UploadLiveRow,
  UploadRowError,
  UploadRowErrorResult,
  UploadSectionData,
  UploadSectionDataRow,
  UploadSectionRollup,
} from "@/features/employer/uploads/queries";
import { UPLOAD_TYPE_LABELS } from "@hrms/db/uploads";

const TIMELINE = ["Created", "Validating", "Validated", "Processing", "Processed"] as const;

function FieldChip({ field }: { field: string }): React.JSX.Element {
  return <Tag color="blue">{field}</Tag>;
}

export function JobPanel({
  employerId,
  upload,
  catalog,
  mismatches,
  errorClass,
  selectedSectionId,
  selectedUploadSectionId,
  sectionData,
  rowErrors,
  batches,
  selectedBatch,
  executionErrors,
  staging,
  finalize,
  liveRow,
  stagingRow,
  selectedEmployeeId,
  employeeProfile,
  employeeAccess,
  employeeLogin,
  employeeLoginAttempts,
  writesEnabled,
}: {
  employerId: number;
  upload: UploadDetail;
  catalog: UploadCatalog | null;
  mismatches: UploadHeaderMismatch[];
  errorClass: UploadErrorClass;
  selectedSectionId: number | null;
  selectedUploadSectionId: number | null;
  sectionData: UploadSectionData | null;
  rowErrors: UploadRowErrorResult | null;
  batches: UploadBatchRow[];
  selectedBatch: UploadBatchDetail | null;
  executionErrors: UploadExecutionError[];
  staging: CreationStagingSummary | null;
  finalize: CreationFinalize | null;
  liveRow: UploadLiveRow | null;
  stagingRow: CreationStagingRow | null;
  selectedEmployeeId: number | null;
  employeeProfile: EmployeeProfile | null;
  employeeAccess: Awaited<ReturnType<typeof getEmployeeAccess>> | null;
  employeeLogin: EmployeeLoginInfo | null;
  employeeLoginAttempts: FailedLoginAttempt[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const selectedSection =
    upload.sections.find(
      (section) => section.uploadSectionId === selectedUploadSectionId,
    ) ??
    upload.sections.find((section) => section.sectionId === selectedSectionId) ??
    upload.sections[0] ??
    null;
  const mismatch = mismatches.find(
    (item) => item.sectionId === selectedSection?.sectionId,
  );

  return (
    <>
      <div className="mb-4">
        <Link href={`/employers/${employerId}/uploads`}>Back to uploads</Link>
      </div>
      {upload.stuck ? (
        <Alert
          className="mb-4"
          showIcon
          type="warning"
          title={`This job is still ${upload.status} after ${formatHours(upload.ageHours)}. Core API retries after 3 hours if the Node process restarts.`}
        />
      ) : null}
      {upload.expired ? (
        <Alert
          className="mb-4"
          showIcon
          type="warning"
          title="This upload is older than 7 days and is treated as expired by Core API."
        />
      ) : null}
      {upload.errorMessage ? (
        <Alert className="mb-4" showIcon type="error" title={upload.errorMessage} />
      ) : null}

      <Card className="mb-4" title={`Upload ${upload.uploadId}`}>
        <Descriptions
          bordered
          column={2}
          size="small"
          items={[
            {
              key: "type",
              label: "Type",
              children: upload.type ? UPLOAD_TYPE_LABELS[upload.type] : (upload.uploadType ?? "—"),
            },
            {
              key: "status",
              label: "Status",
              children: (
                <StatusTag status={upload.status} stuck={upload.stuck} />
              ),
            },
            {
              key: "country",
              label: "Country",
              children: upload.countryName ?? (upload.countryId != null ? String(upload.countryId) : "—"),
            },
            {
              key: "sections",
              label: "Sections",
              children: upload.sectionCount,
            },
            {
              key: "fields",
              label: "Selected fields",
              children: upload.sections.reduce((sum, section) => sum + section.fieldCount, 0),
            },
            { key: "document", label: "DocumentID", children: upload.documentId ?? "—" },
            {
              key: "override",
              label: "IsShowData (override)",
              children: String(upload.isShowData ?? ""),
            },
            {
              key: "created",
              label: "Created",
              children: `${upload.createdDate ?? "—"}${upload.createdByName ? ` · ${upload.createdByName}` : ""}`,
            },
            { key: "validated", label: "ValidatedOn", children: upload.validatedOn ?? "—" },
            { key: "processed", label: "ProcessedOn", children: upload.processedOn ?? "—" },
            { key: "valid", label: "Valid", children: upload.valid },
            { key: "invalid", label: "Invalid", children: upload.invalid },
            { key: "processedCount", label: "Processed", children: upload.processed },
            { key: "unprocessed", label: "Unprocessed", children: upload.unprocessed },
          ]}
        />
        <div className="mt-4">
          <Segmented
            options={[...TIMELINE]}
            value={timelineValue(upload.status)}
            disabled
          />
        </div>
      </Card>

      <Card
        className="mb-4"
        title={`Sections in this upload (${upload.sectionCount})`}
      >
        <Table
          rowKey="uploadSectionId"
          dataSource={upload.sections}
          size="small"
          pagination={false}
          rowClassName={(row) =>
            selectedSection && row.uploadSectionId === selectedSection.uploadSectionId
              ? "bg-slate-50"
              : ""
          }
          columns={[
            {
              title: "Section",
              dataIndex: "section",
              render: (name: string | null, row: UploadSectionRollup) => (
                <Link
                  href={uploadDetailHref(employerId, upload.uploadId, {
                    section: row.uploadSectionId,
                    error: errorClass,
                  })}
                >
                  {name ?? `Section ${row.sectionId ?? row.uploadSectionId}`}
                </Link>
              ),
            },
            {
              title: "Fields selected",
              dataIndex: "fieldCount",
              width: 130,
            },
            { title: "Rows", dataIndex: "total", width: 80 },
            { title: "Valid", dataIndex: "valid", width: 80 },
            { title: "Invalid", dataIndex: "invalid", width: 90 },
            { title: "Processed", dataIndex: "processed", width: 110 },
            { title: "Unprocessed", dataIndex: "unprocessed", width: 120 },
            {
              title: "Headers vs catalog",
              key: "mismatch",
              width: 220,
              render: (_: unknown, row: UploadSectionRollup) => {
                const found = mismatches.find((item) => item.sectionId === row.sectionId);
                if (!found) {
                  return "—";
                }
                if (found.extraInFile.length === 0 && found.missingInCatalog.length === 0) {
                  return <Tag color="green">Match</Tag>;
                }
                return (
                  <>
                    {found.extraInFile.length > 0 ? (
                      <Tag color="orange">{found.extraInFile.length} extra in file</Tag>
                    ) : null}
                    {found.missingInCatalog.length > 0 ? (
                      <Tag>{found.missingInCatalog.length} missing from file</Tag>
                    ) : null}
                  </>
                );
              },
            },
          ]}
        />
        {mismatch && (mismatch.extraInFile.length > 0 || mismatch.missingInCatalog.length > 0) ? (
          <Alert
            className="mt-3"
            showIcon
            type="warning"
            title="Excel headers do not match the current field DisplayText. Renames often look like unexplained validation failures."
            description={
              <div>
                {mismatch.extraInFile.length > 0 ? (
                  <div>In file only: {mismatch.extraInFile.join(", ")}</div>
                ) : null}
                {mismatch.missingInCatalog.length > 0 ? (
                  <div>In catalog only: {mismatch.missingInCatalog.join(", ")}</div>
                ) : null}
              </div>
            }
          />
        ) : null}
      </Card>

      <Card
        className="mb-4"
        title={
          selectedSection
            ? `${selectedSection.section ?? "Section"} · ${selectedSection.fieldCount} fields selected · ${selectedSection.total} rows`
            : "Select a section to see its fields and data"
        }
      >
        {selectedSection ? (
          <>
            <div className="mb-3 flex flex-wrap gap-1">
              {selectedSection.selectedFields.length > 0 ? (
                selectedSection.selectedFields.map((field) => (
                  <FieldChip key={field} field={field} />
                ))
              ) : (
                <span className="text-slate-500">No fields were stored on this section.</span>
              )}
            </div>
            {sectionData?.parseError ? (
              <Alert showIcon type="error" title={sectionData.parseError} />
            ) : (
              <SectionDataTable
                data={sectionData}
                employerId={employerId}
                uploadId={upload.uploadId}
                uploadSectionId={selectedSection.uploadSectionId}
                errorClass={errorClass}
              />
            )}
          </>
        ) : (
          <p className="text-slate-500">This upload has no TEmployeeDetail_Upload_Section rows.</p>
        )}
      </Card>

      <Card className="mb-4" title="Classified row errors">
        <div className="mb-3">
          <Segmented
            value={errorClass}
            options={[
              { label: `Validation (${upload.invalid})`, value: "validation" },
              { label: `Processing (${upload.unprocessed})`, value: "processing" },
              { label: `System (${executionErrors.length})`, value: "system" },
            ]}
            onChange={(next) => {
              router.push(
                uploadDetailHref(employerId, upload.uploadId, {
                  section: selectedSection?.uploadSectionId,
                  error: next as UploadErrorClass,
                }),
              );
            }}
          />
        </div>
        {errorClass === "system" ? (
          <ExecutionTable errors={executionErrors} />
        ) : (
          <RowErrorsTable
            employerId={employerId}
            upload={upload}
            sectionId={selectedSection?.sectionId ?? null}
            errorClass={errorClass}
            result={rowErrors}
          />
        )}
      </Card>

      {liveRow || stagingRow ? (
        <Card className="mb-4" title="Selected row data">
          {liveRow ? (
            <Descriptions
              bordered
              column={2}
              size="small"
              className="mb-3"
              items={[
                { key: "employeeId", label: "EmployeeId", children: liveRow.employeeId },
                {
                  key: "employmentNumber",
                  label: "EmploymentNumber",
                  children: liveRow.employmentNumber ? (
                    <Link
                      href={`/employers/${employerId}/employees/${encodeURIComponent(liveRow.employmentNumber)}`}
                    >
                      {liveRow.employmentNumber}
                    </Link>
                  ) : (
                    "—"
                  ),
                },
                { key: "name", label: "Name", children: liveRow.fullName ?? "—" },
                { key: "email", label: "Work email", children: liveRow.workEmail ?? "—" },
              ]}
            />
          ) : (
            <Alert
              className="mb-3"
              showIcon
              type="warning"
              title="No live TEmployee row for this identity."
            />
          )}
          {stagingRow ? (
            <Descriptions
              bordered
              column={2}
              size="small"
              items={[
                { key: "stagingEmail", label: "Staging email", children: stagingRow.emailId ?? "—" },
                {
                  key: "orphan",
                  label: "Orphan",
                  children: stagingRow.isOrphan ? (
                    <Tag color="red">In staging, not in TEmployee</Tag>
                  ) : (
                    <Tag color="green">Linked</Tag>
                  ),
                },
                {
                  key: "stagingName",
                  label: "Staging name",
                  children: [stagingRow.firstName, stagingRow.lastName].filter(Boolean).join(" ") || "—",
                },
                {
                  key: "stagingEmpNo",
                  label: "Staging employment no.",
                  children: stagingRow.employmentNumber ?? "—",
                },
              ]}
            />
          ) : null}
        </Card>
      ) : null}

      <Card className="mb-4" title="Batches">
        <Table
          rowKey="processedBatchResultId"
          dataSource={batches}
          size="small"
          pagination={false}
          locale={{ emptyText: "No TProcessedBatchResult rows for this upload." }}
          columns={[
            { title: "Batch", dataIndex: "batchNumber", width: 90 },
            { title: "Status", dataIndex: "status", width: 110, render: dash },
            { title: "Created", dataIndex: "createdDate", width: 180, render: dash },
            { title: "UploadSectionID", dataIndex: "uploadSectionId", width: 140 },
            {
              title: "Preview",
              key: "preview",
              width: 110,
              render: (_: unknown, row: UploadBatchRow) => (
                <Link
                  href={uploadDetailHref(employerId, upload.uploadId, {
                    section: selectedSection?.uploadSectionId,
                    error: errorClass,
                    batchId: row.processedBatchResultId,
                  })}
                >
                  Open
                </Link>
              ),
            },
          ]}
        />
        {selectedBatch ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium">EmployeeData</div>
              <ValidationRuleViewCell
                label="Batch EmployeeData"
                value={selectedBatch.employeeDataPreview}
              />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">Result</div>
              <ValidationRuleViewCell
                label="Batch Result"
                value={selectedBatch.resultPreview}
              />
            </div>
          </div>
        ) : null}
      </Card>

      {staging ? (
        <Card className="mb-4" title="Creation staging">
          <p className="mb-3 text-slate-600">
            {staging.stagingCount} staging rows · {staging.orphanCount} orphans (email in
            staging, no TEmployee yet)
          </p>
          <Table
            rowKey={(row) => row.emailId ?? String(row.employeeId ?? "")}
            dataSource={staging.orphans}
            size="small"
            pagination={
              staging.orphans.length > 20
                ? { pageSize: 20, showTotal: (total) => `${total} orphans` }
                : false
            }
            locale={{ emptyText: "No staging orphans." }}
            columns={[
              { title: "Email", dataIndex: "emailId", render: dash },
              {
                title: "Name",
                key: "name",
                render: (_: unknown, row: CreationStagingRow) =>
                  [row.firstName, row.lastName].filter(Boolean).join(" ") || "—",
              },
              { title: "Employment no.", dataIndex: "employmentNumber", render: dash },
              {
                title: "Inspect",
                key: "inspect",
                width: 110,
                render: (_: unknown, row: CreationStagingRow) =>
                  row.emailId ? (
                    <Link
                      href={uploadDetailHref(employerId, upload.uploadId, {
                        section: selectedSection?.uploadSectionId,
                        error: errorClass,
                        workEmail: row.emailId,
                      })}
                    >
                      Open
                    </Link>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
          {finalize ? (
            <Alert
              className="mt-3"
              showIcon
              type="info"
              title={`Finalize status: ${finalize.status ?? "—"}`}
              description={
                <div className="flex gap-3">
                  <ValidationRuleViewCell
                    label="EmploymentNumbersData"
                    value={finalize.employmentNumbersPreview}
                  />
                  <ValidationRuleViewCell
                    label="FinalizedResult"
                    value={finalize.finalizedResultPreview}
                  />
                </div>
              }
            />
          ) : (
            <p className="mt-3 text-slate-500">No finalize row for this upload.</p>
          )}
        </Card>
      ) : null}

      <UploadEmployeeModal
        employerId={employerId}
        open={selectedEmployeeId != null}
        liveRow={liveRow}
        profile={employeeProfile}
        access={employeeAccess}
        login={employeeLogin}
        attempts={employeeLoginAttempts}
        writesEnabled={writesEnabled}
        onClose={() => {
          router.push(
            uploadDetailHref(employerId, upload.uploadId, {
              section: selectedSection?.uploadSectionId,
              error: errorClass,
            }),
          );
        }}
      />

      {catalog ? (
        <div className="text-sm">
          <Link
            href={`/employers/${employerId}/uploads?type=${catalog.type}${catalog.countryId ? `&countryId=${catalog.countryId}` : ""}`}
          >
            Open the catalog for this upload type
          </Link>
        </div>
      ) : null}
    </>
  );
}

function SectionDataTable({
  data,
  employerId,
  uploadId,
  uploadSectionId,
  errorClass,
}: {
  data: UploadSectionData | null;
  employerId: number;
  uploadId: number;
  uploadSectionId: number | null;
  errorClass: UploadErrorClass;
}): React.JSX.Element {
  const [selectedRow, setSelectedRow] = useState<UploadSectionDataRow | null>(null);
  if (!data) {
    return <p className="text-slate-500">No section JSON is stored for this section.</p>;
  }
  if (data.rows.length === 0) {
    return <p className="text-slate-500">This section has no employee rows.</p>;
  }
  return (
    <>
      {data.totalMatched > data.rows.length ? (
        <Alert
          className="mb-3"
          showIcon
          type="info"
          title={`Showing ${data.rows.length} of ${data.totalMatched} rows.`}
        />
      ) : null}
      <Table
        rowKey={(row) => String(row.rowIndex)}
        dataSource={data.rows}
        size="small"
        scroll={{ x: "max-content" }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} rows`,
        }}
        rowClassName={(row) =>
          row.isValid === false ? "upload-row-invalid cursor-pointer" : ""
        }
        onRow={(row) => ({
          onClick: () => {
            if (row.isValid === false) {
              setSelectedRow(row);
            }
          },
        })}
        columns={[
          {
            title: "Name",
            key: "employeeName",
            width: 200,
            ellipsis: true,
            render: (_: unknown, row: UploadSectionDataRow) =>
              row.employeeName || row.employeeId ? (
                <EmployeeIdentityLink
                  employerId={employerId}
                  uploadId={uploadId}
                  uploadSectionId={uploadSectionId}
                  errorClass={errorClass}
                  employeeId={row.employeeId}
                  label={row.employeeName ?? String(row.employeeId)}
                />
              ) : (
                "—"
              ),
          },
          ...data.fields.map((field) => ({
            title: <FieldChip field={field} />,
            key: field,
            width: 160,
            ellipsis: true,
            render: (_: unknown, row: UploadSectionDataRow) => {
              const value = row.values[field] ?? "—";
              if (isIdentityField(field) && row.employeeId) {
                return (
                  <EmployeeIdentityLink
                    employerId={employerId}
                    uploadId={uploadId}
                    uploadSectionId={uploadSectionId}
                    errorClass={errorClass}
                    employeeId={row.employeeId}
                    label={value}
                  />
                );
              }
              return value;
            },
          })),
          {
            title: "Valid",
            dataIndex: "isValid",
            width: 90,
            render: (value: boolean | null) =>
              value == null ? "—" : value ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>,
          },
          {
            title: "Processed",
            dataIndex: "isProcessed",
            width: 110,
            render: (value: boolean | null) =>
              value == null ? "—" : value ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
          },
          {
            title: "Errors",
            dataIndex: "errors",
            width: 280,
            render: (errors: string[], row: UploadSectionDataRow) =>
              row.isValid === false ? <RowErrorList errors={errors} /> : "—",
          },
        ]}
      />
      <Modal
        title={`Row ${selectedRow ? selectedRow.rowIndex + 1 : ""} validation errors`}
        open={selectedRow != null}
        onCancel={() => setSelectedRow(null)}
        footer={null}
      >
        {selectedRow ? <RowErrorList errors={selectedRow.errors} /> : null}
      </Modal>
    </>
  );
}

function isIdentityField(field: string): boolean {
  return field.trim().toLowerCase() === "id";
}

function EmployeeIdentityLink({
  employerId,
  uploadId,
  uploadSectionId,
  errorClass,
  employeeId,
  label,
}: {
  employerId: number;
  uploadId: number;
  uploadSectionId: number | null;
  errorClass: UploadErrorClass;
  employeeId: number | null;
  label: string;
}): React.JSX.Element {
  const router = useRouter();
  if (!employeeId) {
    return <>{label}</>;
  }
  return (
    <Button
      type="link"
      className="h-auto p-0"
      onClick={(event) => {
        event.stopPropagation();
        router.push(
          uploadDetailHref(employerId, uploadId, {
            section: uploadSectionId,
            error: errorClass,
            employeeId,
          }),
        );
      }}
    >
      {label}
    </Button>
  );
}

function RowErrorList({ errors }: { errors: string[] }): React.JSX.Element {
  if (errors.length === 0) {
    return (
      <p className="text-slate-500">
        This row is marked invalid, but Section_JSON has no errorFields or
        errorMessage text.
      </p>
    );
  }
  const items = errors.map((text, position) => ({
    key: `${position}:${text}`,
    text,
  }));
  return (
    <Listy
      items={items}
      rowKey="key"
      itemRender={(item) => item.text}
    />
  );
}

function RowErrorsTable({
  employerId,
  upload,
  sectionId,
  errorClass,
  result,
}: {
  employerId: number;
  upload: UploadDetail;
  sectionId: number | null;
  errorClass: Exclude<UploadErrorClass, "system">;
  result: UploadRowErrorResult | null;
}): React.JSX.Element {
  if (result?.parseError) {
    return <Alert showIcon type="error" title={result.parseError} />;
  }
  const rows = (result?.rows ?? []).map((row, position) => ({
    ...row,
    key: `${row.rowIndex}-${row.employeeId ?? ""}-${row.workEmail ?? ""}-${row.fieldName ?? ""}-${row.message}-${position}`,
  }));
  return (
    <>
      {result && result.totalMatched > rows.length ? (
        <Alert
          className="mb-3"
          showIcon
          type="info"
          title={`Showing ${rows.length} of ${result.totalMatched} matching rows.`}
        />
      ) : null}
      <Table
        rowKey="key"
        dataSource={rows}
        size="small"
        scroll={{ x: "max-content" }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} errors`,
        }}
        locale={{
          emptyText:
            errorClass === "validation"
              ? "No validation errors in this section."
              : "No processing errors in this section.",
        }}
        columns={[
          {
            title: upload.type === "creation" ? "Work Email" : "Employee ID",
            key: "identity",
            width: 200,
            render: (_: unknown, row: UploadRowError) =>
              upload.type === "creation" ? (row.workEmail ?? "—") : (row.employeeId ?? "—"),
          },
          { title: "Name", dataIndex: "employeeName", width: 180, render: dash },
          {
            title: "Employment no.",
            dataIndex: "employmentNumber",
            width: 160,
            render: (value: string | null) =>
              value ? (
                <Link
                  href={`/employers/${employerId}/employees/${encodeURIComponent(value)}`}
                >
                  {value}
                </Link>
              ) : (
                "—"
              ),
          },
          { title: "Field", dataIndex: "fieldName", width: 160, render: dash },
          { title: "Message", dataIndex: "message", width: 280 },
          {
            title: "Persist",
            key: "persist",
            width: 200,
            render: (_: unknown, row: UploadRowError) =>
              [row.dbTable, row.dbColumn].filter(Boolean).join(".") || "—",
          },
          {
            title: "Rule",
            dataIndex: "validationRule",
            width: 160,
            render: (value: string | null, row: UploadRowError) =>
              value ? (
                <ValidationRuleViewCell
                  label={`ValidationRule: ${row.fieldName ?? "field"}`}
                  value={value}
                />
              ) : (
                "—"
              ),
          },
          {
            title: "Data",
            key: "data",
            width: 140,
            render: (_: unknown, row: UploadRowError) => (
              <>
                {row.isOrphan ? <Tag color="red">Orphan</Tag> : null}
                <Link
                  href={uploadDetailHref(employerId, upload.uploadId, {
                    section: upload.sections.find((item) => item.sectionId === sectionId)
                      ?.uploadSectionId,
                    error: errorClass,
                    employeeId: row.employeeId,
                    workEmail: row.workEmail,
                  })}
                >
                  Inspect
                </Link>
              </>
            ),
          },
        ]}
      />
    </>
  );
}

function ExecutionTable({
  errors,
}: {
  errors: UploadExecutionError[];
}): React.JSX.Element {
  return (
    <Table
      rowKey="logId"
      dataSource={errors}
      size="small"
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize: 20,
        showTotal: (total) => `${total} system errors`,
      }}
      locale={{
        emptyText:
          "No execution-log ERROR rows. This database may not have TBulkUpdateProfile_ExecutionLog / TBulkCreationProfile_ExecutionLog.",
      }}
      columns={[
        { title: "When", dataIndex: "createdDate", width: 180, render: dash },
        { title: "Procedure", dataIndex: "procedureName", width: 240, ellipsis: true },
        { title: "Batch", dataIndex: "batchNumber", width: 80 },
        { title: "Section", dataIndex: "sectionId", width: 90 },
        {
          title: "Identity",
          key: "identity",
          width: 160,
          render: (_: unknown, row: UploadExecutionError) =>
            row.workEmail ?? row.employeeId ?? "—",
        },
        { title: "Error", dataIndex: "errorMessage", width: 280, ellipsis: true },
        {
          title: "Dynamic SQL",
          dataIndex: "dynamicSql",
          width: 180,
          render: (value: string | null) =>
            value ? <ValidationRuleViewCell label="DynamicSQL" value={value} /> : "—",
        },
      ]}
    />
  );
}

function timelineValue(status: string | null): string {
  if (status && TIMELINE.includes(status as (typeof TIMELINE)[number])) {
    return status;
  }
  if (status === "Failed") {
    return "Processing";
  }
  return "Created";
}

function formatHours(value: number | null): string {
  if (value == null) {
    return "an unknown time";
  }
  const hours = Math.round(value);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function dash(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "—";
  }
  return String(value);
}
