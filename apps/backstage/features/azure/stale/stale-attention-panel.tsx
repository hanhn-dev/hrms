"use client";

import { App, Alert, Button, Card, Select, Spin, Table, Tag } from "antd";
import {
  STALE_DAYS_OPTIONS,
  type StaleDays,
} from "@/features/azure/stale/stale-days-preference";
import {
  buildReminderText,
  groupStaleByAssignee,
  type StaleWorkItem,
} from "@/features/azure/stale/stale-work-items";

export type StaleAttentionPanelProps = {
  readonly staleDays: StaleDays;
  readonly onStaleDaysChange: (days: StaleDays) => void;
  readonly staleItems: readonly StaleWorkItem[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly onOpenWorkItem: (id: number) => void;
};

export function StaleAttentionPanel({
  staleDays,
  onStaleDaysChange,
  staleItems,
  loading,
  error,
  onOpenWorkItem,
}: StaleAttentionPanelProps): React.JSX.Element {
  const { message } = App.useApp();
  const groups = groupStaleByAssignee(staleItems);
  const firstRowByAssignee = new Set(
    groups.map((group) => group.items[0]?.item.id).filter((id): id is number => id != null),
  );

  async function copyReminder(assignee: string): Promise<void> {
    const group = groups.find((entry) => entry.assignee === assignee);
    if (group == null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(buildReminderText(group));
      message.success(`Copied reminder for ${group.assignee}`);
    } catch {
      message.error("Could not copy the reminder.");
    }
  }

  return (
    <Card
      size="small"
      title="Needs attention"
      extra={
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Stuck after</span>
          <Select
            className="min-w-24"
            options={STALE_DAYS_OPTIONS.map((days) => ({
              label: `${days} days`,
              value: days,
            }))}
            value={staleDays}
            onChange={(value: StaleDays) => {
              onStaleDaysChange(value);
            }}
          />
        </div>
      }
    >
      {error != null ? (
        <Alert className="mb-3" showIcon title={error} type="error" />
      ) : null}
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
          <Spin size="small" />
          Checking how long items have been in their current status…
        </div>
      ) : staleItems.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">No items past the threshold.</p>
      ) : (
        <Table
          columns={[
            {
              title: "Assignee",
              dataIndex: "assignee",
              key: "assignee",
              width: 200,
              render: (assignee: string, row: StaleWorkItem) => (
                <div className="flex flex-wrap items-center gap-1">
                  <span>{assignee}</span>
                  {firstRowByAssignee.has(row.item.id) ? (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        void copyReminder(assignee);
                      }}
                    >
                      Copy reminder
                    </Button>
                  ) : null}
                </div>
              ),
            },
            {
              title: "ID",
              key: "id",
              width: 90,
              render: (_value, row: StaleWorkItem) => (
                <button
                  className="cursor-pointer border-0 bg-transparent p-0 text-blue-600 hover:underline"
                  type="button"
                  onClick={() => {
                    onOpenWorkItem(row.item.id);
                  }}
                >
                  #{row.item.id}
                </button>
              ),
            },
            {
              title: "Title",
              key: "title",
              ellipsis: true,
              render: (_value, row: StaleWorkItem) => (
                <button
                  className="cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
                  type="button"
                  onClick={() => {
                    onOpenWorkItem(row.item.id);
                  }}
                >
                  {row.item.title}
                </button>
              ),
            },
            {
              title: "State",
              key: "state",
              width: 120,
              render: (_value, row: StaleWorkItem) => row.item.state,
            },
            {
              title: "Days",
              dataIndex: "daysInState",
              key: "daysInState",
              width: 80,
              align: "right" as const,
              render: (days: number | null) => (days == null ? "—" : days),
            },
            {
              title: "Reason",
              dataIndex: "reason",
              key: "reason",
              width: 100,
              render: (reason: StaleWorkItem["reason"]) =>
                reason === "blocked" ? (
                  <Tag color="red">Blocked</Tag>
                ) : (
                  <Tag color="orange">Stale</Tag>
                ),
            },
          ]}
          dataSource={staleItems.map((entry) => ({ ...entry, key: entry.item.id }))}
          pagination={false}
          size="small"
        />
      )}
    </Card>
  );
}
