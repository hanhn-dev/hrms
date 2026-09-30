"use server";

import { z } from "zod";
import {
  executeFunction as executeFunctionFromDb,
  executeSelect as executeSelectFromDb,
  listEmployers as listEmployersFromDb,
  listTables as listTablesFromDb,
  listTableColumns as listTableColumnsFromDb,
  previewTableRows as previewTableRowsFromDb,
  searchValueInTables as searchValueInTablesFromDb,
  type ExploreSearchInput,
  type ExploreSearchMode,
  type ExploreSearchTableResult,
  type ExploreTable,
  type ExecuteFunctionResult,
  type ExecuteSelectResult,
  type PreviewTableRowsResult,
} from "@hrms/db";
import {
  executeStoredProcedure,
  getCatalog,
  getObjectDetails,
  type DatabaseCatalog,
  type DatabaseColumn,
  type DatabaseObjectDetails,
  type DatabaseObjectKind,
  type StoredProcedureExecutionResult,
} from "@hrms/database-inspector";
import {
  assertWritesEnabled,
  createConfirmToken,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import {
  assertSameEnvironment,
  getHrmsDb,
  getSelectedEnvironment,
  listConfiguredEnvironments,
} from "@/shared/db";
import {
  getInspectorConfig,
  getInspectorConfigForEnvironment,
} from "@/shared/db/inspector";

export type {
  ExploreSearchInput,
  ExploreSearchMode,
  ExploreSearchTableResult,
  ExploreTable,
  ExecuteFunctionResult,
  ExecuteSelectResult,
  PreviewTableRowsResult,
  DatabaseCatalog,
  DatabaseColumn,
  DatabaseObjectDetails,
  DatabaseObjectKind,
  StoredProcedureExecutionResult,
};

export type EmployerOption = {
  employerId: number;
  employerName: string;
};

export async function listEmployerOptions(): Promise<EmployerOption[]> {
  await requireRootAdmin();
  const rows = await listEmployersFromDb(await getHrmsDb());
  return rows.map((row) => ({
    employerId: row.employerId,
    employerName: row.employerName,
  }));
}

export async function listTables(q?: string): Promise<ExploreTable[]> {
  await requireRootAdmin();
  return listTablesFromDb(await getHrmsDb(), { q });
}

export async function listTableColumns(tableName: string, schemaName?: string) {
  await requireRootAdmin();
  return listTableColumnsFromDb(await getHrmsDb(), tableName, schemaName);
}

export async function searchValueInTables(
  input: ExploreSearchInput,
): Promise<ExploreSearchTableResult[]> {
  await requireRootAdmin();
  return searchValueInTablesFromDb(await getHrmsDb(), input);
}

export async function executeFunction(input: {
  schema: string;
  name: string;
  payload: Record<string, unknown>;
}): Promise<ExecuteFunctionResult> {
  await requireRootAdmin();
  return executeFunctionFromDb(await getHrmsDb(), {
    schema: input.schema,
    name: input.name,
    payload: input.payload,
  });
}

export async function previewTableRows(input: {
  schema?: string;
  table: string;
  employerId?: number | null;
  top?: number;
}): Promise<PreviewTableRowsResult> {
  await requireRootAdmin();
  return previewTableRowsFromDb(await getHrmsDb(), input);
}

export async function runSelect(input: {
  sql: string;
  maxRows?: number;
}): Promise<ExecuteSelectResult> {
  await requireRootAdmin();
  return executeSelectFromDb(await getHrmsDb(), input);
}

export async function fetchCatalog(input?: {
  schema?: string;
  kinds?: DatabaseObjectKind[];
  includeRelationships?: boolean;
  q?: string;
}): Promise<DatabaseCatalog> {
  await requireRootAdmin();
  const catalog = await getCatalog(await getInspectorConfig(), {
    schema: input?.schema,
    kinds: input?.kinds,
    includeRelationships: input?.includeRelationships ?? true,
  });

  const q = input?.q?.trim().toLowerCase();
  if (!q) {
    return catalog;
  }

  const scored = catalog.objects
    .map((obj) => {
      const name = obj.name.toLowerCase();
      const schema = obj.schema.toLowerCase();
      const qualified = `${schema}.${name}`;
      if (name !== q && !name.includes(q) && !schema.includes(q) && !qualified.includes(q)) {
        return null;
      }
      // Prefer exact / prefix name matches so tables like TEmployee* beat
      // substring hits such as GetEmployee* (…temployee…).
      const score =
        name === q ? 3 : name.startsWith(q) ? 2 : qualified.startsWith(q) ? 1 : 0;
      return { obj, score, name };
    })
    .filter((entry): entry is { obj: (typeof catalog.objects)[number]; score: number; name: string } => entry !== null)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return {
    ...catalog,
    objects: scored.map((entry) => entry.obj),
  };
}

export async function fetchObjectDetails(input: {
  schema: string;
  name: string;
  kind: DatabaseObjectKind;
  includeDependents?: boolean;
  includeRelationships?: boolean;
  includeDefinition?: boolean;
  includeDependencies?: boolean;
  includeStructure?: boolean;
}): Promise<DatabaseObjectDetails> {
  await requireRootAdmin();
  return getObjectDetails(await getInspectorConfig(), {
    schema: input.schema,
    name: input.name,
    kind: input.kind,
    includeDependents: input.includeDependents,
    includeRelationships: input.includeRelationships,
    includeDefinition: input.includeDefinition,
    includeDependencies: input.includeDependencies,
    includeStructure: input.includeStructure,
  });
}

const procedurePayloadSchema = z.record(z.string(), z.unknown());

const procedureConfirmSchema = z.object({
  env: z.string().min(1),
  schema: z.string().min(1),
  name: z.string().min(1),
  payload: procedurePayloadSchema,
});

export async function previewExecuteProcedure(input: {
  schema: string;
  name: string;
  payload: Record<string, unknown>;
}): Promise<{
  env: string;
  schema: string;
  name: string;
  dryRun: StoredProcedureExecutionResult;
  token: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const config = await getInspectorConfig(env);
  const dryRun = await executeStoredProcedure(config, {
    schema: input.schema,
    name: input.name,
    payload: input.payload,
    dryRun: true,
  });
  return {
    env,
    schema: input.schema,
    name: input.name,
    dryRun,
    token: createConfirmToken({
      env,
      schema: input.schema,
      name: input.name,
      payload: input.payload,
    }),
  };
}

export async function confirmExecuteProcedure(
  token: string,
): Promise<StoredProcedureExecutionResult> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, procedureConfirmSchema);
  assertWritesEnabled(payload.env);
  await assertSameEnvironment(payload.env);
  return executeStoredProcedure(await getInspectorConfig(payload.env), {
    schema: payload.schema,
    name: payload.name,
    payload: payload.payload,
    dryRun: false,
  });
}

export type ObjectCompareStatus =
  | "unchanged"
  | "modified"
  | "added"
  | "removed"
  | "unknown";

export type ObjectCompareRow = {
  id: string;
  schema: string;
  name: string;
  kind: DatabaseObjectKind;
  status: ObjectCompareStatus;
  leftDefinition: string | null;
  rightDefinition: string | null;
};

export type EnvCompareResult = {
  leftEnv: string;
  rightEnv: string;
  rows: ObjectCompareRow[];
  summary: Record<ObjectCompareStatus, number>;
};

function objectKey(
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): string {
  return `${kind}:${schema}.${name}`;
}

function fingerprintColumns(
  details: DatabaseObjectDetails | null,
): string | null {
  if (!details) {
    return null;
  }
  if (details.definition) {
    return details.definition;
  }
  if (details.columns.length > 0) {
    return details.columns
      .map(
        (col) =>
          `${col.name}:${col.dataType}:${col.nullable ? "null" : "notnull"}:${col.primaryKey ? "pk" : ""}`,
      )
      .join("\n");
  }
  if (details.parameters.length > 0) {
    return details.parameters
      .map((p) => `${p.name}:${p.dataType}:${p.mode ?? "in"}`)
      .join("\n");
  }
  return null;
}

export async function compareEnvironments(input: {
  rightEnv: string;
  kinds?: DatabaseObjectKind[];
  q?: string;
}): Promise<EnvCompareResult> {
  await requireRootAdmin();
  const leftEnv = await getSelectedEnvironment();
  const rightEnv = input.rightEnv.trim().toUpperCase();
  if (!listConfiguredEnvironments().includes(rightEnv)) {
    throw new Error(`Unknown environment: ${rightEnv}`);
  }
  if (leftEnv === rightEnv) {
    throw new Error("Pick a different environment to compare against.");
  }

  const kinds = input.kinds ?? [
    "table",
    "view",
    "storedProcedure",
    "function",
  ];
  const [leftCatalog, rightCatalog] = await Promise.all([
    getCatalog(getInspectorConfigForEnvironment(leftEnv), {
      kinds,
      includeRelationships: false,
    }),
    getCatalog(getInspectorConfigForEnvironment(rightEnv), {
      kinds,
      includeRelationships: false,
    }),
  ]);

  const q = input.q?.trim().toLowerCase() ?? "";
  const filterObj = (schema: string, name: string): boolean => {
    if (!q) {
      return true;
    }
    return (
      name.toLowerCase().includes(q) ||
      schema.toLowerCase().includes(q) ||
      `${schema}.${name}`.toLowerCase().includes(q)
    );
  };

  const leftMap = new Map(
    leftCatalog.objects
      .filter((o) => filterObj(o.schema, o.name))
      .map((o) => [objectKey(o.schema, o.name, o.kind), o]),
  );
  const rightMap = new Map(
    rightCatalog.objects
      .filter((o) => filterObj(o.schema, o.name))
      .map((o) => [objectKey(o.schema, o.name, o.kind), o]),
  );

  const keys = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort();
  // Cap detail fetches for UI responsiveness.
  const DETAIL_CAP = 80;
  const detailKeys = keys.slice(0, DETAIL_CAP);

  const detailsPairs = await Promise.all(
    detailKeys.map(async (key) => {
      const left = leftMap.get(key);
      const right = rightMap.get(key);
      const [leftDetails, rightDetails] = await Promise.all([
        left
          ? getObjectDetails(getInspectorConfigForEnvironment(leftEnv), {
              schema: left.schema,
              name: left.name,
              kind: left.kind,
            }).catch(() => null)
          : Promise.resolve(null),
        right
          ? getObjectDetails(getInspectorConfigForEnvironment(rightEnv), {
              schema: right.schema,
              name: right.name,
              kind: right.kind,
            }).catch(() => null)
          : Promise.resolve(null),
      ]);
      return { key, left, right, leftDetails, rightDetails };
    }),
  );

  const detailByKey = new Map(detailsPairs.map((p) => [p.key, p]));

  const rows: ObjectCompareRow[] = keys.map((key) => {
    const left = leftMap.get(key);
    const right = rightMap.get(key);
    const pair = detailByKey.get(key);
    const leftDefinition = fingerprintColumns(pair?.leftDetails ?? null);
    const rightDefinition = fingerprintColumns(pair?.rightDetails ?? null);

    let status: ObjectCompareStatus;
    if (left && !right) {
      status = "removed";
    } else if (!left && right) {
      status = "added";
    } else if (!pair) {
      status = "unknown";
    } else if (leftDefinition === rightDefinition) {
      status = "unchanged";
    } else if (leftDefinition == null || rightDefinition == null) {
      status = "unknown";
    } else {
      status = "modified";
    }

    const ref = left ?? right!;
    return {
      id: key,
      schema: ref.schema,
      name: ref.name,
      kind: ref.kind,
      status,
      leftDefinition,
      rightDefinition,
    };
  });

  const summary: Record<ObjectCompareStatus, number> = {
    unchanged: 0,
    modified: 0,
    added: 0,
    removed: 0,
    unknown: 0,
  };
  for (const row of rows) {
    summary[row.status] += 1;
  }

  return { leftEnv, rightEnv, rows, summary };
}
