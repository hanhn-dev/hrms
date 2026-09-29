"use client";

import { DatePicker, Form, Input, InputNumber, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { useMemo } from "react";
import type { SectionFormField } from "@/features/employee/sections/queries";
import {
  errorsForField,
  validateRow,
} from "@/features/employee/sections/validation";
import { DEFAULT_DATE_FORMAT } from "@/shared/format-date";

dayjs.extend(customParseFormat);

export type SectionFormValues = Record<
  string,
  string | number | boolean | null
>;

function isDateType(fieldType: string | null | undefined): boolean {
  const t = (fieldType ?? "").toLowerCase();
  return t.includes("date");
}

function isNumericType(fieldType: string | null | undefined): boolean {
  const t = (fieldType ?? "").toLowerCase();
  return t.includes("numeric") || t.includes("number");
}

function isTextArea(fieldType: string | null | undefined): boolean {
  const t = (fieldType ?? "").toLowerCase();
  return t.includes("text area") || t.includes("textarea");
}

function isYesNo(fieldType: string | null | undefined): boolean {
  const t = (fieldType ?? "").toLowerCase();
  return (
    t.includes("yes") ||
    t.includes("check box") ||
    t.includes("checkbox") ||
    t.includes("radio")
  );
}

function toFormInitial(
  fields: SectionFormField[],
  values: SectionFormValues | null,
): Record<string, unknown> {
  const initial: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values?.[field.displayText] ?? null;
    if (isDateType(field.fieldType) && raw != null && raw !== "") {
      const parsed = dayjs(String(raw));
      initial[field.displayText] = parsed.isValid() ? parsed : null;
    } else {
      initial[field.displayText] = raw;
    }
  }
  return initial;
}

function normalizeSubmit(
  fields: SectionFormField[],
  raw: Record<string, unknown>,
): SectionFormValues {
  const out: SectionFormValues = {};
  for (const field of fields) {
    const value = raw[field.displayText];
    if (value == null || value === "") {
      out[field.displayText] = null;
      continue;
    }
    if (dayjs.isDayjs(value)) {
      out[field.displayText] = (value as Dayjs).format(DEFAULT_DATE_FORMAT);
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      out[field.displayText] = value;
      continue;
    }
    out[field.displayText] = String(value);
  }
  return out;
}

export function SectionRecordForm({
  formId,
  fields,
  initialValues,
  onSubmit,
}: {
  formId: string;
  fields: SectionFormField[];
  initialValues: SectionFormValues | null;
  onSubmit: (values: SectionFormValues) => void;
}): React.JSX.Element {
  const [form] = Form.useForm();
  const fieldDefs = useMemo(
    () =>
      fields.map((f) => ({
        displayText: f.displayText,
        isMandatory: f.isMandatory,
        validationRule: f.validationRule,
        fieldType: f.fieldType,
      })),
    [fields],
  );

  return (
    <Form
      id={formId}
      form={form}
      layout="vertical"
      initialValues={toFormInitial(fields, initialValues)}
      onFinish={(raw) => {
        const values = normalizeSubmit(fields, raw as Record<string, unknown>);
        const result = validateRow(values, fieldDefs);
        if (!result.isValid) {
          for (const err of result.errorFields) {
            form.setFields([
              {
                name: err.fieldName,
                errors: err.errors,
              },
            ]);
          }
          return;
        }
        onSubmit(values);
      }}
      onValuesChange={(_, all) => {
        const values = normalizeSubmit(fields, all as Record<string, unknown>);
        const result = validateRow(values, fieldDefs);
        for (const field of fields) {
          const errors = errorsForField(result, field.displayText);
          form.setFields([
            {
              name: field.displayText,
              errors,
            },
          ]);
        }
      }}
    >
      {fields.map((field) => {
        if (isDateType(field.fieldType)) {
          return (
            <Form.Item
              key={field.fieldId}
              name={field.displayText}
              label={field.displayText}
              rules={
                field.isMandatory
                  ? [{ required: true, message: "This field can't be empty." }]
                  : undefined
              }
            >
              <DatePicker format={DEFAULT_DATE_FORMAT} style={{ width: "100%" }} />
            </Form.Item>
          );
        }
        if (isNumericType(field.fieldType)) {
          return (
            <Form.Item
              key={field.fieldId}
              name={field.displayText}
              label={field.displayText}
              rules={
                field.isMandatory
                  ? [{ required: true, message: "This field can't be empty." }]
                  : undefined
              }
            >
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          );
        }
        if (isYesNo(field.fieldType)) {
          return (
            <Form.Item
              key={field.fieldId}
              name={field.displayText}
              label={field.displayText}
              rules={
                field.isMandatory
                  ? [{ required: true, message: "This field can't be empty." }]
                  : undefined
              }
            >
              <Select
                allowClear
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                  { value: "Y", label: "Y" },
                  { value: "N", label: "N" },
                  { value: "1", label: "1" },
                  { value: "0", label: "0" },
                ]}
              />
            </Form.Item>
          );
        }
        if (isTextArea(field.fieldType)) {
          return (
            <Form.Item
              key={field.fieldId}
              name={field.displayText}
              label={field.displayText}
              rules={
                field.isMandatory
                  ? [{ required: true, message: "This field can't be empty." }]
                  : undefined
              }
            >
              <Input.TextArea rows={3} />
            </Form.Item>
          );
        }
        return (
          <Form.Item
            key={field.fieldId}
            name={field.displayText}
            label={field.displayText}
            rules={
              field.isMandatory
                ? [{ required: true, message: "This field can't be empty." }]
                : undefined
            }
          >
            <Input />
          </Form.Item>
        );
      })}
    </Form>
  );
}

export function fieldsForTable(
  fields: SectionFormField[],
  liveTable: string,
): SectionFormField[] {
  return fields.filter(
    (f) =>
      f.dbTable != null &&
      f.dbTable.toLowerCase() === liveTable.toLowerCase(),
  );
}
