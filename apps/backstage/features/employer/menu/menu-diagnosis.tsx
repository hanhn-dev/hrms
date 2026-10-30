"use client";

import { useState } from "react";
import { Alert, Collapse, Space, Table } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  commitCopyTemplate,
  commitRebuildMenuXml,
  commitRestoreMenuSnapshot,
  previewCopyTemplate,
  previewRebuildMenuXml,
  previewRestoreMenuSnapshot,
} from "@/features/employer/menu/mutations";
import { searchCopyTargets, type MenuDiagnosis } from "@/features/employer/menu/queries";
import { describeMenu } from "@/features/employer/menu/menu-labels";
import { formatDate } from "@/shared/format-date";
import { ConfirmWriteModal, SearchSelect, Text } from "@/shared/ui";

const WRITES_OFF = "Writes are disabled.";

export function MenuDiagnosisPanel({
  diagnosis,
  writesEnabled,
}: {
  diagnosis: MenuDiagnosis;
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const status = describeMenu(diagnosis);
  const restorable = diagnosis.history.filter(
    (row) => row.health === "healthy" && formatDate(row.historyCreatedAt) !== "—",
  );
  const undatedCopyCount = diagnosis.history.filter(
    (row) => row.health === "healthy" && formatDate(row.historyCreatedAt) === "—",
  ).length;
  const [copyIds, setCopyIds] = useState<number[]>([]);
  const [copyOptions, setCopyOptions] = useState<Array<{ value: number; label: string }>>([]);

  async function loadCopyOptions(query: string): Promise<void> {
    const page = await searchCopyTargets(query);
    setCopyOptions((current) => {
      const byId = new Map(current.map((option) => [option.value, option]));
      for (const row of page.rows) {
        byId.set(row.employerId, {
          value: row.employerId,
          label: row.employerName ?? `Organization ${row.employerId}`,
        });
      }
      return [...byId.values()];
    });
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Alert showIcon type={status.tone} title={status.title} description={status.detail} />
      {status.canShowInAccessRights ? (
        <ConfirmWriteModal
          buttonLabel="Show this menu in Access Right Management"
          disabled={!writesEnabled}
          disabledReason={WRITES_OFF}
          onDone={() => {
            router.refresh();
          }}
          previewAction={() => previewRebuildMenuXml(diagnosis.employerId)}
          commitAction={commitRebuildMenuXml}
          successMessage="Access Right Management will show this menu."
          title="Show this menu in Access Right Management"
        />
      ) : null}
      <Collapse
        items={[
          {
            key: "more",
            label: diagnosis.employerId === 0 ? "Copy this menu to other organizations" : "Older copies and other fixes",
            children:
              diagnosis.employerId === 0 ? (
                <CopyStandardMenu
                  copyIds={copyIds}
                  options={copyOptions}
                  writesEnabled={writesEnabled}
                  onChange={setCopyIds}
                  onSearch={(value) => {
                    void loadCopyOptions(value);
                  }}
                  onOpen={() => {
                    void loadCopyOptions("");
                  }}
                  onDone={() => {
                    setCopyIds([]);
                    router.refresh();
                  }}
                />
              ) : (
                <OtherFixes
                  diagnosis={diagnosis}
                  restorable={restorable}
                  undatedCopyCount={undatedCopyCount}
                  writesEnabled={writesEnabled}
                  onDone={() => {
                    router.refresh();
                  }}
                />
              ),
          },
        ]}
      />
    </Space>
  );
}

function OtherFixes({
  diagnosis,
  restorable,
  undatedCopyCount,
  writesEnabled,
  onDone,
}: {
  diagnosis: MenuDiagnosis;
  restorable: MenuDiagnosis["history"];
  undatedCopyCount: number;
  writesEnabled: boolean;
  onDone: () => void;
}): React.JSX.Element {
  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Text>
        Replace this organization&apos;s menu with the standard one, or put an older copy back.
        People who already have the menu open need to sign out and back in.
      </Text>
      <Space wrap>
        <Link href="/employers/0/menu">Look at the standard menu</Link>
        <ConfirmWriteModal
          buttonLabel="Replace with the standard menu"
          disabled={!writesEnabled}
          disabledReason={WRITES_OFF}
          onDone={onDone}
          previewAction={() => previewCopyTemplate([diagnosis.employerId])}
          commitAction={commitCopyTemplate}
          successMessage="This organization now uses a copy of the standard menu."
          title="Replace with the standard menu"
        />
      </Space>
      <Table
        pagination={false}
        rowKey="rowKey"
        size="small"
        dataSource={restorable.map((row, index) => ({
          ...row,
          rowKey: `${row.snapshotKey}#${index}`,
        }))}
        locale={{
          emptyText:
            undatedCopyCount > 0
              ? "Older copies exist, but they were saved without a date, so they are not listed."
              : "There is no older copy you can put back.",
        }}
        columns={[
          {
            title: "When",
            dataIndex: "historyCreatedAt",
            render: (value: string | null) => {
              const formatted = formatDate(value);
              return formatted === "—" ? "Date not recorded" : formatted;
            },
          },
          {
            title: "",
            width: 120,
            render: (_, row) => (
              <ConfirmWriteModal
                buttonLabel="Put this back"
                disabled={!writesEnabled}
                disabledReason={WRITES_OFF}
                onDone={onDone}
                previewAction={() =>
                  previewRestoreMenuSnapshot({
                    employerId: diagnosis.employerId,
                    snapshotKey: row.snapshotKey,
                  })
                }
                commitAction={commitRestoreMenuSnapshot}
                successMessage="The older menu is back."
                title="Put this older menu back"
              />
            ),
          },
        ]}
      />
    </Space>
  );
}

function CopyStandardMenu({
  copyIds,
  options,
  writesEnabled,
  onChange,
  onSearch,
  onOpen,
  onDone,
}: {
  copyIds: number[];
  options: Array<{ value: number; label: string }>;
  writesEnabled: boolean;
  onChange: (ids: number[]) => void;
  onSearch: (value: string) => void;
  onOpen: () => void;
  onDone: () => void;
}): React.JSX.Element {
  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Text>
        This replaces the menu on each organization you pick. It does not run when you save the
        standard menu. Items their license does not include are left out, and you will see that
        list before anything is changed.
      </Text>
      <SearchSelect
        mode="multiple"
        filterOption={false}
        options={options}
        placeholder="Search organizations"
        style={{ width: "100%" }}
        value={copyIds}
        onChange={(value) => {
          onChange(value);
        }}
        onOpenChange={(open) => {
          if (open) {
            onOpen();
          }
        }}
        onSearch={onSearch}
      />
      <ConfirmWriteModal
        buttonLabel="Copy to the selected organizations"
        disabled={!writesEnabled || copyIds.length === 0}
        disabledReason={writesEnabled ? "Choose at least one organization." : WRITES_OFF}
        onDone={onDone}
        previewAction={() => previewCopyTemplate(copyIds)}
        commitAction={commitCopyTemplate}
        successMessage="Those organizations now have this menu."
        title="Copy the standard menu"
      />
    </Space>
  );
}
