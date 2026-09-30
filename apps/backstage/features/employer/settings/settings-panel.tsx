"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tabs,
  Typography,
} from "antd";
import {
  CUSTOMER_SETTING_CATEGORIES,
  CUSTOMER_SETTING_FIELD_BY_KEY,
  settingValuesEqual,
  type CustomerSettingCategoryId,
  type CustomerSettingField,
  type CustomerSettingUiValue,
} from "@/features/employer/settings/catalog";
import {
  commitUpdateCustomerSettings,
  previewUpdateCustomerSettings,
} from "@/features/employer/settings/mutations";
import { ConfirmWriteModal, JsonEditorModal, JsonTextCell } from "@/shared/ui";

type MissingCustomerSettingColumn = {
  key: string;
  label: string;
  table: string;
  column: string;
};

type CustomerSettingsView = {
  employerId: number;
  customerId: string;
  customerName: string | null;
  hasTneConfig: boolean;
  hasPayrollConfig: boolean;
  values: Record<string, CustomerSettingUiValue>;
  missingColumns: MissingCustomerSettingColumn[];
};

export function CustomerSettingsPanel({
  employerId,
  settings,
  writesEnabled,
}: {
  employerId: number;
  settings: CustomerSettingsView | null;
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<CustomerSettingCategoryId>("auth");
  const [draft, setDraft] = useState<Record<string, CustomerSettingUiValue>>(
    settings?.values ?? {},
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<Record<
    string,
    CustomerSettingUiValue
  > | null>(null);
  const [jsonEditorKey, setJsonEditorKey] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settings?.values ?? {});
  }, [settings]);

  const category = useMemo(
    () => CUSTOMER_SETTING_CATEGORIES.find((item) => item.id === categoryId),
    [categoryId],
  );

  const missingByKey = useMemo(
    () => new Map((settings?.missingColumns ?? []).map((column) => [column.key, column])),
    [settings],
  );

  const dirtyPatch = useMemo(() => {
    if (!category || !settings) {
      return {};
    }
    const patch: Record<string, CustomerSettingUiValue> = {};
    for (const key of category.keys) {
      if (missingByKey.has(key)) {
        continue;
      }
      const next = draft[key] ?? null;
      const current = settings.values[key] ?? null;
      if (!settingValuesEqual(current, next)) {
        patch[key] = next;
      }
    }
    return patch;
  }, [category, draft, missingByKey, settings]);

  const dirtyCount = Object.keys(dirtyPatch).length;
  const jsonField =
    jsonEditorKey == null
      ? null
      : (CUSTOMER_SETTING_FIELD_BY_KEY[jsonEditorKey] ?? null);

  if (!settings) {
    return (
      <Alert
        showIcon
        type="warning"
        title="No TCustomerSettings row"
        description="This employer has no customer settings row. Troubleshooter will not insert one."
      />
    );
  }

  function setValue(key: string, value: CustomerSettingUiValue): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function openCategoryConfirm(): void {
    if (dirtyCount === 0) {
      return;
    }
    setPendingPatch(dirtyPatch);
    setConfirmOpen(true);
  }

  const groups = category?.groups?.length
    ? category.groups
    : [{ label: category?.label ?? "Settings", keys: category?.keys ?? [] }];

  return (
    <>
      <Card
        extra={
          <Space>
            <Typography.Text type="secondary">
              {dirtyCount === 0
                ? "No unsaved changes in this category"
                : `${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"}`}
            </Typography.Text>
            <Button
              disabled={!writesEnabled || dirtyCount === 0}
              title={
                writesEnabled
                  ? undefined
                  : "Writes are disabled."
              }
              type="primary"
              onClick={openCategoryConfirm}
            >
              Preview save
            </Button>
          </Space>
        }
        title="Customer settings"
      >
        <MissingColumnAlert columns={settings.missingColumns} />
        <Tabs
          activeKey={categoryId}
          items={CUSTOMER_SETTING_CATEGORIES.map((item) => ({
            key: item.id,
            label: item.label,
            children:
              item.id === categoryId ? (
                <div className="flex flex-col gap-6">
                  {groups.map((group) => (
                    <section key={group.label}>
                      <Typography.Title className="!mb-3" level={5}>
                        {group.label}
                      </Typography.Title>
                      <div className="flex flex-col gap-4">
                        {group.keys.map((key) => {
                          const field = CUSTOMER_SETTING_FIELD_BY_KEY[key];
                          if (!field) {
                            return null;
                          }
                          return (
                            <SettingFieldRow
                              key={key}
                              disabled={!writesEnabled}
                              draft={draft}
                              field={field}
                              unavailable={missingByKey.has(key)}
                              value={draft[key] ?? null}
                              onJsonEdit={() => {
                                setJsonEditorKey(key);
                              }}
                              onChange={(next) => {
                                setValue(key, next);
                              }}
                            />
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null,
          }))}
          tabPlacement="start"
          onChange={(key) => {
            setCategoryId(key as CustomerSettingCategoryId);
          }}
        />
      </Card>
      <JsonEditorModal
        disabledReason="Writes are disabled."
        open={jsonField != null}
        readOnly={!writesEnabled}
        title={jsonField?.label ?? "JSON"}
        value={
          jsonField
            ? ((draft[jsonField.key] as string | null | undefined) ?? null)
            : null
        }
        onCancel={() => {
          setJsonEditorKey(null);
        }}
        onSave={(compact) => {
          if (!jsonField) {
            return;
          }
          setValue(jsonField.key, compact);
          setJsonEditorKey(null);
          setPendingPatch({ [jsonField.key]: compact });
          setConfirmOpen(true);
        }}
      />
      <ConfirmWriteModal
        hideTrigger
        buttonLabel="Preview save"
        open={confirmOpen}
        previewAction={() =>
          previewUpdateCustomerSettings({
            employerId,
            category: categoryId,
            patch: pendingPatch ?? {},
          })
        }
        commitAction={commitUpdateCustomerSettings}
        successMessage="Customer settings updated."
        title={`Update ${category?.label ?? "customer settings"}`}
        onDone={() => {
          setPendingPatch(null);
          router.refresh();
        }}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setPendingPatch(null);
          }
        }}
      />
    </>
  );
}

function MissingColumnAlert({
  columns,
}: {
  columns: readonly MissingCustomerSettingColumn[];
}): React.JSX.Element | null {
  const first = columns[0];
  if (!first) {
    return null;
  }
  return (
    <Alert
      className="mb-4"
      showIcon
      type="warning"
      title={
        columns.length === 1
          ? `${first.label} is unavailable`
          : "Some settings are unavailable"
      }
      description={columns
        .map(
          (column) =>
            `${column.label} needs dbo.${column.table}.${column.column}, which is not in this database yet.`,
        )
        .join(" ")}
    />
  );
}

function SettingFieldRow({
  field,
  value,
  draft,
  disabled,
  unavailable,
  onChange,
  onJsonEdit,
}: {
  field: CustomerSettingField;
  value: CustomerSettingUiValue;
  draft: Record<string, CustomerSettingUiValue>;
  disabled: boolean;
  unavailable: boolean;
  onChange: (value: CustomerSettingUiValue) => void;
  onJsonEdit: () => void;
}): React.JSX.Element {
  const enabled =
    !field.enabledWhen ||
    settingValuesEqual(
      draft[field.enabledWhen.key] ?? null,
      field.enabledWhen.value as CustomerSettingUiValue,
    );
  const controlDisabled = disabled || !enabled;

  return (
    <div className="grid gap-2 border-b border-[var(--ant-color-split)] pb-4 last:border-b-0 last:pb-0 md:grid-cols-[minmax(16rem,22rem)_1fr] md:items-start">
      <div>
        <Typography.Text strong>{field.label}</Typography.Text>
        {field.description ? (
          <Typography.Paragraph className="!mb-0 !mt-1" type="secondary">
            {field.description}
          </Typography.Paragraph>
        ) : null}
      </div>
      <div>
        {unavailable ? (
          <Typography.Text type="secondary">Not in this database</Typography.Text>
        ) : (
          <SettingControl
            disabled={controlDisabled}
            field={field}
            value={value}
            onChange={onChange}
            onJsonEdit={onJsonEdit}
          />
        )}
      </div>
    </div>
  );
}

function SettingControl({
  field,
  value,
  disabled,
  onChange,
  onJsonEdit,
}: {
  field: CustomerSettingField;
  value: CustomerSettingUiValue;
  disabled: boolean;
  onChange: (value: CustomerSettingUiValue) => void;
  onJsonEdit: () => void;
}): React.JSX.Element {
  if (field.type === "json") {
    return (
      <JsonTextCell
        value={typeof value === "string" ? value : value == null ? null : JSON.stringify(value)}
        onClick={onJsonEdit}
      />
    );
  }
  if (field.type === "bool") {
    return (
      <Space>
        <Switch
          checked={value === true}
          checkedChildren={field.trueLabel}
          disabled={disabled}
          unCheckedChildren={field.falseLabel}
          onChange={(checked) => {
            onChange(checked);
          }}
        />
        <Typography.Text type="secondary">
          {value === true
            ? (field.trueLabel ?? "Yes")
            : (field.falseLabel ?? "No")}
        </Typography.Text>
      </Space>
    );
  }
  if (field.type === "number") {
    return (
      <InputNumber
        className="w-full max-w-xs"
        disabled={disabled}
        max={field.max}
        min={field.min}
        value={typeof value === "number" ? value : null}
        onChange={(next) => {
          onChange(next);
        }}
      />
    );
  }
  if (field.type === "select") {
    return (
      <Select
        allowClear
        className="w-full max-w-md"
        disabled={disabled}
        options={field.options?.map((option) => ({
          label: option.label,
          value: option.value,
        }))}
        value={value === null ? undefined : value}
        onChange={(next) => {
          onChange(next == null ? null : (next as string | number));
        }}
      />
    );
  }
  if (field.secret) {
    return (
      <Input.Password
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    );
  }
  return (
    <Input.TextArea
      autoSize={{ minRows: 1, maxRows: 6 }}
      disabled={disabled}
      value={typeof value === "string" ? value : value == null ? "" : String(value)}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
