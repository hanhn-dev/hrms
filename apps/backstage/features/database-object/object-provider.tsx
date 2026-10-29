"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Modal, Tag } from "antd";
import { KIND_COLOR, KIND_LABEL } from "@/features/dbs/kind-style";
import {
  mentionSegments,
  objectCandidates,
  objectKindKey,
  wholeObject,
  type ObjectKindMap,
} from "@/features/database-object/mentions";
import { DatabaseObjectChip } from "@/features/database-object/object-chip";
import { ScriptTabBody, type ScriptTab } from "@/features/employer/inspector/script-tab-body";
import {
  resolveScriptObject,
  resolveScriptObjectKinds,
  type ResolvedScript,
} from "@/features/employer/inspector/queries";
import { HighlightMatch } from "@/shared/ui";

type ObjectTarget = {
  schema: string;
  name: string;
};

type DatabaseObjectContextValue = {
  kinds: ObjectKindMap;
  openObject: (object: ObjectTarget) => void;
};

const DatabaseObjectContext = createContext<DatabaseObjectContextValue>({
  kinds: {},
  openObject: () => {},
});

export function DatabaseObjectProvider({
  texts,
  writesEnabled,
  children,
}: {
  texts: readonly string[];
  writesEnabled: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const [kinds, setKinds] = useState<ObjectKindMap>({});
  const [stack, setStack] = useState<ObjectTarget[]>([]);
  const signature = texts.join("\0");

  useEffect(() => {
    const seen = new Set<string>();
    const found: ObjectTarget[] = [];
    for (const text of signature.split("\0")) {
      for (const object of objectCandidates(text)) {
        const key = objectKindKey(object.schema, object.name);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        found.push(object);
      }
    }
    if (found.length === 0) {
      setKinds({});
      return;
    }
    let cancelled = false;
    void resolveScriptObjectKinds(found)
      .then((rows) => {
        if (cancelled) {
          return;
        }
        const next: Record<string, string> = {};
        for (const row of rows) {
          next[objectKindKey(row.schema, row.name)] = row.kind;
        }
        setKinds(next);
      })
      .catch(() => {
        if (!cancelled) {
          setKinds({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [signature]);

  const current = stack[stack.length - 1] ?? null;

  return (
    <DatabaseObjectContext.Provider
      value={{
        kinds,
        openObject: (object) => {
          setStack((previous) => [...previous, object]);
        },
      }}
    >
      {children}
      <DatabaseObjectScriptModal
        current={current}
        stackDepth={stack.length}
        writesEnabled={writesEnabled}
        onBack={() => {
          setStack((previous) => previous.slice(0, -1));
        }}
        onClose={() => {
          setStack([]);
        }}
        onOpenObject={(object) => {
          setStack((previous) => [...previous, object]);
        }}
      />
    </DatabaseObjectContext.Provider>
  );
}

export function DatabaseObjectText({
  text,
  query,
}: {
  text: string;
  query?: string;
}): React.JSX.Element {
  const { kinds, openObject } = useContext(DatabaseObjectContext);
  const segments = mentionSegments(text, kinds);
  if (segments.length === 0) {
    return <HighlightMatch query={query} text={text} />;
  }
  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <HighlightMatch key={index} query={query} text={segment.text} />
        ) : (
          <DatabaseObjectChip
            key={index}
            kind={segment.kind}
            query={query}
            text={segment.text}
            onOpen={() => {
              openObject({ schema: segment.schema, name: segment.name });
            }}
          />
        ),
      )}
    </>
  );
}

export function DatabaseObjectName({
  text,
  query,
}: {
  text: string;
  query?: string;
}): React.JSX.Element {
  const { kinds, openObject } = useContext(DatabaseObjectContext);
  const object = wholeObject(text, kinds);
  if (!object) {
    return <HighlightMatch query={query} text={text} />;
  }
  return (
    <DatabaseObjectChip
      kind={object.kind}
      query={query}
      text={object.text}
      onOpen={() => {
        openObject({ schema: object.schema, name: object.name });
      }}
    />
  );
}

function DatabaseObjectScriptModal({
  current,
  stackDepth,
  writesEnabled,
  onBack,
  onClose,
  onOpenObject,
}: {
  current: ObjectTarget | null;
  stackDepth: number;
  writesEnabled: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpenObject: (object: ObjectTarget) => void;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<ResolvedScript | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = current ? `${current.schema}.${current.name}:${reloadKey}` : "";
  const [request, setRequest] = useState(requestKey);
  if (request !== requestKey) {
    setRequest(requestKey);
    setLoading(current != null);
    setError(null);
    setScript(null);
  }

  useEffect(() => {
    if (!current) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setScript(null);
    void resolveScriptObject(current)
      .then((resolved) => {
        if (cancelled) {
          return;
        }
        if (!resolved) {
          setError(`No script or table named ${current.schema}.${current.name}.`);
          setScript(null);
          return;
        }
        setScript(resolved);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [current, reloadKey]);

  const tab: ScriptTab | null = current
    ? {
        key: `${current.schema}.${current.name}`,
        schema: script?.schema ?? current.schema,
        name: script?.name ?? current.name,
        kind: script?.kind ?? "lookup",
        loading,
        error,
        script,
      }
    : null;

  const kind = script?.kind;
  const titleName = current ? `${current.schema}.${current.name}` : "Database object";

  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={current != null}
      title={
        <span className="inline-flex items-center gap-2">
          {stackDepth > 1 ? (
            <Button icon={<ArrowLeftOutlined />} size="small" onClick={onBack}>
              Back
            </Button>
          ) : null}
          {kind && kind in KIND_COLOR ? (
            <Tag color={KIND_COLOR[kind as keyof typeof KIND_COLOR]}>
              {KIND_LABEL[kind as keyof typeof KIND_LABEL]}
            </Tag>
          ) : null}
          <span>{titleName}</span>
        </span>
      }
      width={1100}
      onCancel={onClose}
    >
      {tab ? (
        <ScriptTabBody
          key={tab.key}
          tab={tab}
          writesEnabled={writesEnabled}
          onOpenObject={onOpenObject}
          onRefresh={() => {
            setReloadKey((value) => value + 1);
          }}
        />
      ) : null}
    </Modal>
  );
}
