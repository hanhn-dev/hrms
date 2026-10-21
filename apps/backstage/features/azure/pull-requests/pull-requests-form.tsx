"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Button, DatePicker, Input, Radio, Tabs } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  emptyPullRequestSearchCriteria,
  PULL_REQUEST_STATUS_OPTIONS,
  WORK_ITEM_STATE_OPTIONS,
  WORK_ITEM_TYPE_OPTIONS,
  type PullRequestDateField,
  type PullRequestSearchCriteria,
} from "@hrms/azure-devops/criteria";
import type { PullRequestSearchOptions } from "@/features/azure/pull-requests/queries";
import { canSearchPullRequests } from "@/features/azure/pull-requests/search-criteria";
import { SearchSelect, Text } from "@/shared/ui";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function optionLabel(name: string, path: string, nameCounts: ReadonlyMap<string, number>): string {
  return (nameCounts.get(name) ?? 0) > 1 ? `${name} (${path})` : name;
}

export function PullRequestsForm({
  loading,
  options,
  onSubmit,
  onClear,
}: {
  loading: boolean;
  options: PullRequestSearchOptions;
  onSubmit: (criteria: PullRequestSearchCriteria) => void;
  onClear: () => void;
}): React.JSX.Element {
  const [criteria, setCriteria] = useState<PullRequestSearchCriteria>(emptyPullRequestSearchCriteria());
  const ready = canSearchPullRequests(criteria);

  const moduleOptions = useMemo(() => {
    const nameCounts = new Map<string, number>();
    for (const area of options.modules) {
      nameCounts.set(area.name, (nameCounts.get(area.name) ?? 0) + 1);
    }
    return options.modules.map((area) => ({
      value: area.path,
      label: optionLabel(area.name, area.path, nameCounts),
    }));
  }, [options.modules]);

  const memberOptions = useMemo(
    () =>
      options.teamMembers.map((member) => ({
        value: member.displayName,
        label: member.displayName,
      })),
    [options.teamMembers],
  );

  const authorOptions = useMemo(
    () =>
      options.teamMembers.map((member) => ({
        value: member.id,
        label: member.displayName,
      })),
    [options.teamMembers],
  );

  const iterationNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const iteration of options.iterations) {
      counts.set(iteration.name, (counts.get(iteration.name) ?? 0) + 1);
    }
    return counts;
  }, [options.iterations]);

  function patch(partial: Partial<PullRequestSearchCriteria>): void {
    setCriteria((current) => ({ ...current, ...partial }));
  }

  function clear(): void {
    setCriteria(emptyPullRequestSearchCriteria());
    onClear();
  }

  const rangeValue: [Dayjs | null, Dayjs | null] | null =
    criteria.dateFrom === null && criteria.dateTo === null
      ? null
      : [criteria.dateFrom ? dayjs(criteria.dateFrom) : null, criteria.dateTo ? dayjs(criteria.dateTo) : null];

  const workItemFields = (
    <div className="grid gap-3">
      <Field label="Work item IDs">
        <Input
          allowClear
          className="w-full"
          placeholder="12345, 45678, 8910"
          value={criteria.workItemIds}
          onChange={(event) => patch({ workItemIds: event.target.value })}
        />
      </Field>
      <Field label="Module">
        <SearchSelect
          allowClear
          className="w-full"
          mode="multiple"
          options={moduleOptions}
          placeholder="Area path"
          value={[...criteria.areaPaths]}
          onChange={(value) => patch({ areaPaths: value ?? [] })}
        />
      </Field>
      <Field label="Type">
        <SearchSelect
          allowClear
          className="w-full"
          mode="multiple"
          options={WORK_ITEM_TYPE_OPTIONS.map((type) => ({ value: type, label: type }))}
          placeholder="Product backlog item, bug, or task"
          value={[...criteria.types]}
          onChange={(value) => patch({ types: value ?? [] })}
        />
      </Field>
      <Field label="State">
        <SearchSelect
          allowClear
          className="w-full"
          mode="multiple"
          options={WORK_ITEM_STATE_OPTIONS.map((state) => ({ value: state, label: state }))}
          placeholder="Any state"
          value={[...criteria.states]}
          onChange={(value) => patch({ states: value ?? [] })}
        />
      </Field>
      <Field label="Iteration">
        <SearchSelect
          allowClear
          className="w-full"
          options={options.iterations.map((iteration) => ({
            value: iteration.path,
            label: optionLabel(iteration.name, iteration.path, iterationNameCounts),
          }))}
          placeholder="Sprint"
          value={criteria.iterationPath || undefined}
          onChange={(value) => patch({ iterationPath: value ?? "" })}
        />
      </Field>
      <Field label="Assigned to">
        <SearchSelect
          allowClear
          className="w-full"
          mode="multiple"
          options={memberOptions}
          placeholder="Team member"
          value={[...criteria.assignees]}
          onChange={(value) => patch({ assignees: value ?? [] })}
        />
      </Field>
      <Field label="Tags">
        <Input
          allowClear
          className="w-full"
          placeholder="tag1, tag2"
          value={criteria.tags}
          onChange={(event) => patch({ tags: event.target.value })}
        />
      </Field>
      <Field label="Title contains">
        <Input
          allowClear
          className="w-full"
          placeholder="Words in the work item title"
          value={criteria.titleContains}
          onChange={(event) => patch({ titleContains: event.target.value })}
          onPressEnter={() => {
            if (ready) {
              onSubmit(criteria);
            }
          }}
        />
      </Field>
    </div>
  );

  const pullRequestFields = (
    <div className="grid gap-3">
      <Field label="Work item IDs">
        <Input
          allowClear
          className="w-full"
          placeholder="12345, 45678, 8910"
          value={criteria.workItemIds}
          onChange={(event) => patch({ workItemIds: event.target.value })}
          onPressEnter={() => {
            if (ready) {
              onSubmit(criteria);
            }
          }}
        />
      </Field>
      <Field label="Date applies to">
        <Radio.Group
          className="w-full"
          options={[
            { label: "Opened", value: "opened" },
            { label: "Merged", value: "merged" },
          ]}
          value={criteria.dateField}
          onChange={(event) => patch({ dateField: event.target.value as PullRequestDateField })}
        />
      </Field>
      <Field label="Date range">
        <DatePicker.RangePicker
          className="w-full"
          value={rangeValue}
          onChange={(values) => {
            patch({
              dateFrom: values?.[0]?.format("YYYY-MM-DD") ?? null,
              dateTo: values?.[1]?.format("YYYY-MM-DD") ?? null,
            });
          }}
        />
      </Field>
      {criteria.dateField === "merged" ? (
        <Text type="secondary">
          Active pull requests have no merged date, so a merged range leaves them out.
        </Text>
      ) : null}
      <Field label="Authors">
        <SearchSelect
          allowClear
          className="w-full"
          mode="multiple"
          options={authorOptions}
          placeholder="Team member"
          value={[...criteria.authorIds]}
          onChange={(value) => patch({ authorIds: value ?? [] })}
        />
      </Field>
      <Field label="Status">
        <SearchSelect
          allowClear
          className="w-full"
          mode="multiple"
          options={PULL_REQUEST_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
          placeholder="Active, completed, or abandoned"
          value={[...criteria.statuses]}
          onChange={(value) => patch({ statuses: value ?? [] })}
        />
      </Field>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs
        className="min-h-0 flex-1 [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:overflow-y-auto [&_.ant-tabs-content]:h-full"
        defaultActiveKey="pull-requests"
        items={[
          { key: "pull-requests", label: "Pull requests", children: pullRequestFields },
          { key: "work-items", label: "Work items", children: workItemFields },
        ]}
        size="small"
      />
      <div className="shrink-0 border-t border-slate-200 bg-white pt-3 dark:border-slate-700 dark:bg-transparent">
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!ready}
            icon={<SearchOutlined />}
            loading={loading}
            type="primary"
            onClick={() => onSubmit(criteria)}
          >
            Find pull requests
          </Button>
          <Button disabled={loading} onClick={clear}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
