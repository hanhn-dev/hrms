"use client";

import {
  CaretDownOutlined,
  CaretRightOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Input, Select, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import {
  addObjectProperty,
  appendArrayItem,
  defaultValueForType,
  isPlainObject,
  jsonTypeOf,
  nodeSummary,
  parseTypedValue,
  removeAtPath,
  renameObjectKey,
  setAtPath,
  type JsonPath,
  type JsonType,
} from "@/shared/ui/json-tree";

const TYPE_OPTIONS: Array<{ label: string; value: JsonType }> = [
  { label: "string", value: "string" },
  { label: "number", value: "number" },
  { label: "boolean", value: "boolean" },
  { label: "null", value: "null" },
  { label: "object", value: "object" },
  { label: "array", value: "array" },
];

export function JsonTreeEditor({
  value,
  readOnly,
  onChange,
}: {
  value: unknown;
  readOnly?: boolean;
  onChange: (next: unknown) => void;
}): React.JSX.Element {
  return (
    <div className="max-h-[32rem] overflow-auto font-mono text-sm">
      <JsonNode
        path={[]}
        readOnly={readOnly === true}
        root={value}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function JsonNode({
  root,
  path,
  value,
  readOnly,
  onChange,
  onRemove,
  label,
  onRename,
}: {
  root: unknown;
  path: JsonPath;
  value: unknown;
  readOnly: boolean;
  onChange: (next: unknown) => void;
  onRemove?: () => void;
  label?: string;
  onRename?: (next: string) => void;
}): React.JSX.Element {
  const type = jsonTypeOf(value);
  const isContainer = type === "object" || type === "array";
  const [expanded, setExpanded] = useState(path.length <= 1);
  const [adding, setAdding] = useState(false);

  const childCount = Array.isArray(value)
    ? value.length
    : isPlainObject(value)
      ? Object.keys(value).length
      : 0;

  return (
    <div>
      <div className="group/row flex min-h-7 items-center gap-1 rounded px-1 hover:bg-slate-50">
        {isContainer ? (
          <button
            aria-label={expanded ? "Collapse" : "Expand"}
            className="inline-flex h-5 w-4 items-center justify-center text-slate-400"
            type="button"
            onClick={() => {
              setExpanded((current) => !current);
            }}
          >
            {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        {label != null ? (
          <KeyLabel
            readOnly={readOnly || onRename == null}
            value={label}
            onCommit={onRename}
          />
        ) : null}
        {label != null && !isContainer ? (
          <span className="text-slate-400">:</span>
        ) : null}
        {isContainer ? (
          <span className="text-slate-400">
            {expanded
              ? childCount === 0
                ? type === "array"
                  ? "[]"
                  : "{}"
                : null
              : collapsedPreview(value)}
          </span>
        ) : (
          <ValueLabel
            readOnly={readOnly}
            value={value}
            onCommit={(next) => {
              onChange(setAtPath(root, path, next));
            }}
          />
        )}
        {readOnly ? null : (
          <span className="ml-auto flex opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100">
            {isContainer ? (
              <Button
                aria-label={type === "array" ? "Add object" : "Add property"}
                icon={<PlusOutlined />}
                size="small"
                type="text"
                onClick={() => {
                  if (type === "array") {
                    onChange(appendArrayItem(root, path, {}));
                    setExpanded(true);
                    return;
                  }
                  setExpanded(true);
                  setAdding(true);
                }}
              />
            ) : null}
            {onRemove ? (
              <Button
                aria-label="Remove"
                danger
                icon={<DeleteOutlined />}
                size="small"
                type="text"
                onClick={onRemove}
              />
            ) : null}
          </span>
        )}
      </div>
      {isContainer && expanded ? (
        <div className="ml-3 border-l border-slate-200 pl-2">
          {type === "array" && Array.isArray(value)
            ? value.map((item, index) => (
                <JsonNode
                  key={index}
                  label={arrayItemLabel(index, item)}
                  path={[...path, index]}
                  readOnly={readOnly}
                  root={root}
                  value={item}
                  onChange={onChange}
                  onRemove={
                    readOnly
                      ? undefined
                      : () => {
                          onChange(removeAtPath(root, [...path, index]));
                        }
                  }
                />
              ))
            : null}
          {type === "object" && isPlainObject(value)
            ? Object.keys(value).map((key) => (
                <JsonNode
                  key={key}
                  label={key}
                  path={[...path, key]}
                  readOnly={readOnly}
                  root={root}
                  value={value[key]}
                  onChange={onChange}
                  onRemove={
                    readOnly
                      ? undefined
                      : () => {
                          onChange(removeAtPath(root, [...path, key]));
                        }
                  }
                  onRename={
                    readOnly
                      ? undefined
                      : (next) => {
                          onChange(renameObjectKey(root, path, key, next));
                        }
                  }
                />
              ))
            : null}
          {adding && type === "object" && isPlainObject(value) ? (
            <AddPropertyRow
              existingKeys={Object.keys(value)}
              onAdd={(name, nextValue) => {
                onChange(addObjectProperty(root, path, name, nextValue));
                setAdding(false);
              }}
              onCancel={() => {
                setAdding(false);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function collapsedPreview(value: unknown): string {
  if (isPlainObject(value)) {
    const count = Object.keys(value).length;
    return count === 0 ? "{}" : `{${count}}`;
  }
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  return nodeSummary(value);
}

function arrayItemLabel(index: number, item: unknown): string {
  const summary = nodeSummary(item);
  if (isPlainObject(item) && typeof item.rule === "string" && item.rule.trim()) {
    return `[${index}] ${summary}`;
  }
  return `[${index}]`;
}

function KeyLabel({
  value,
  readOnly,
  onCommit,
}: {
  value: string;
  readOnly: boolean;
  onCommit?: (next: string) => void;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (readOnly || onCommit == null || !editing) {
    return (
      <button
        className="rounded px-0.5 text-slate-600 hover:bg-slate-200/70"
        disabled={readOnly || onCommit == null}
        type="button"
        onClick={() => {
          if (!readOnly && onCommit) {
            setEditing(true);
          }
        }}
      >
        {value}
      </button>
    );
  }

  return (
    <Input
      autoFocus
      className="w-36 font-mono"
      size="small"
      value={draft}
      onBlur={() => {
        const next = draft.trim();
        setEditing(false);
        if (!next || next === value) {
          setDraft(value);
          return;
        }
        try {
          onCommit(next);
        } catch {
          setDraft(value);
        }
      }}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onPressEnter={(event) => {
        event.currentTarget.blur();
      }}
    />
  );
}

function ValueLabel({
  value,
  readOnly,
  onCommit,
}: {
  value: unknown;
  readOnly: boolean;
  onCommit: (next: unknown) => void;
}): React.JSX.Element {
  const type = jsonTypeOf(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stringifyLiteral(value));
  useEffect(() => {
    setDraft(stringifyLiteral(value));
  }, [value]);

  if (readOnly || !editing) {
    return (
      <button
        className={`rounded px-0.5 text-left hover:bg-slate-200/70 ${valueTone(type)}`}
        disabled={readOnly}
        type="button"
        onClick={() => {
          if (!readOnly) {
            setEditing(true);
          }
        }}
      >
        {formatLiteral(value)}
      </button>
    );
  }

  if (type === "boolean") {
    return (
      <Select
        autoFocus
        className="min-w-24"
        options={[
          { label: "true", value: "true" },
          { label: "false", value: "false" },
        ]}
        size="small"
        value={value === true ? "true" : "false"}
        onBlur={() => {
          setEditing(false);
        }}
        onChange={(next) => {
          onCommit(next === "true");
          setEditing(false);
        }}
      />
    );
  }

  if (type === "null") {
    return (
      <Select
        autoFocus
        className="min-w-28"
        options={TYPE_OPTIONS.filter((option) => option.value !== "object" && option.value !== "array")}
        size="small"
        value="null"
        onBlur={() => {
          setEditing(false);
        }}
        onChange={(next: JsonType) => {
          onCommit(defaultValueForType(next));
          setEditing(false);
        }}
      />
    );
  }

  return (
    <Input
      autoFocus
      className="min-w-48 flex-1 font-mono"
      size="small"
      value={draft}
      onBlur={() => {
        setEditing(false);
        if (type === "number") {
          const parsed = parseTypedValue("number", draft);
          if (parsed.ok) {
            onCommit(parsed.value);
            return;
          }
          setDraft(stringifyLiteral(value));
          return;
        }
        onCommit(draft);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onPressEnter={(event) => {
        event.currentTarget.blur();
      }}
    />
  );
}

function formatLiteral(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (value === null) {
    return "null";
  }
  return String(value);
}

function stringifyLiteral(value: unknown): string {
  if (value == null) {
    return "";
  }
  return String(value);
}

function valueTone(type: JsonType): string {
  switch (type) {
    case "string":
      return "text-amber-700";
    case "number":
      return "text-sky-700";
    case "boolean":
    case "null":
      return "text-violet-700";
    default:
      return "text-slate-700";
  }
}

function AddPropertyRow({
  existingKeys,
  onAdd,
  onCancel,
}: {
  existingKeys: string[];
  onAdd: (key: string, value: unknown) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [name, setName] = useState("");
  const [type, setType] = useState<JsonType>("string");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const needsValue = type === "string" || type === "number" || type === "boolean";

  function add(): void {
    const key = name.trim();
    if (!key) {
      setError("Enter a property name.");
      return;
    }
    if (existingKeys.includes(key)) {
      setError("Property already exists.");
      return;
    }
    const parsed = parseTypedValue(type, type === "boolean" ? raw || "false" : raw);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onAdd(key, parsed.value);
  }

  return (
    <div className="py-1">
      <Space.Compact className="w-full max-w-xl">
        <Input
          autoFocus
          className="font-mono"
          placeholder="Property"
          size="small"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
        />
        <Select
          className="min-w-28"
          options={TYPE_OPTIONS}
          size="small"
          value={type}
          onChange={(next) => {
            setType(next);
            setRaw(next === "boolean" ? "false" : "");
            setError(null);
          }}
        />
        {needsValue ? (
          type === "boolean" ? (
            <Select
              className="min-w-24"
              options={[
                { label: "true", value: "true" },
                { label: "false", value: "false" },
              ]}
              size="small"
              value={raw || "false"}
              onChange={setRaw}
            />
          ) : (
            <Input
              className="font-mono"
              placeholder="Value"
              size="small"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setError(null);
              }}
              onPressEnter={() => {
                add();
              }}
            />
          )
        ) : null}
        <Button size="small" type="primary" onClick={add}>
          Add
        </Button>
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
      </Space.Compact>
      {error ? (
        <Typography.Text className="mt-1 block" type="danger">
          {error}
        </Typography.Text>
      ) : null}
    </div>
  );
}
