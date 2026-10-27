"use server";

import {
  findScriptObject,
  findScriptObjectKinds,
  formatTableLength,
  formatTableType,
  getModuleDefinition as getModuleDefinitionFromDb,
  getTableDefinition as getTableDefinitionFromDb,
  listEmployers as listEmployersFromDb,
  listTableColumnDefinitions as listTableColumnDefinitionsFromDb,
  listModules as listModulesFromDb,
  listSearchTargets as listSearchTargetsFromDb,
  listTableColumns as listTableColumnsFromDb,
  listTables as listTablesFromDb,
  searchValueExistence as searchValueExistenceFromDb,
  searchValueInTables as searchValueInTablesFromDb,
  captureQueryScript,
  type ExistenceSearchInput,
  type ExistenceTableResult,
  type ExploreSearchMode,
  type ExploreSearchTableResult,
  type ModuleDefinition,
  type ModuleKind,
  type ModuleSummary,
  type ScriptObjectKind,
  type SearchTarget,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb, getSelectedEnvironment, listConfiguredEnvironments } from "@/shared/db";
import { parseEnvironmentName } from "@/shared/db/environments";

export type {
  ExistenceSearchInput,
  ExistenceTableResult,
  ExploreSearchMode,
  ExploreSearchTableResult,
  ModuleDefinition,
  ModuleKind,
  ModuleSummary,
  ScriptObjectKind,
  SearchTarget,
};

export type InspectorEmployer = {
  employerId: number;
  employerName: string;
};

export async function listInspectorEmployers(): Promise<InspectorEmployer[]> {
  await requireFeature("employers");
  const rows = await listEmployersFromDb(await getHrmsDb());
  return rows.map((row) => ({
    employerId: row.employerId,
    employerName: row.employerName,
  }));
}

export async function listSearchTargets(): Promise<SearchTarget[]> {
  await requireFeature("employers");
  return listSearchTargetsFromDb(await getHrmsDb());
}

export async function searchValueExistence(
  input: ExistenceSearchInput,
): Promise<{ hits: ExistenceTableResult[]; queryScript: string }> {
  await requireFeature("employers");
  const db = await getHrmsDb();
  const loaded = await captureQueryScript(() =>
    searchValueExistenceFromDb(db, input),
  );
  return { hits: loaded.result, queryScript: loaded.script };
}

export async function searchInspectorTable(input: {
  schema: string;
  table: string;
  value: string;
  mode: ExploreSearchMode;
  employerId: number | null;
}): Promise<ExploreSearchTableResult> {
  await requireFeature("employers");
  const qualified = `${input.schema}.${input.table}`;
  const results = await searchValueInTablesFromDb(await getHrmsDb(), {
    tables: [qualified],
    value: input.value,
    mode: input.mode,
    employerId: input.employerId,
  });
  const result = results[0];
  if (!result) {
    throw new Error(`Search returned no result for ${qualified}.`);
  }
  return result;
}

export async function listModules(input: {
  kind: ModuleKind;
  q?: string;
}): Promise<ModuleSummary[]> {
  await requireFeature("employers");
  return listModulesFromDb(await getHrmsDb(), input);
}

export async function listInspectorTables(input: {
  q?: string;
}): Promise<Array<{ schema: string; name: string }>> {
  await requireFeature("employers");
  return listTablesFromDb(await getHrmsDb(), { q: input.q });
}

export async function listInspectorEnvironments(): Promise<{
  environments: string[];
  selected: string;
}> {
  await requireFeature("employers");
  return {
    environments: listConfiguredEnvironments(),
    selected: await getSelectedEnvironment(),
  };
}

export type InspectorObjectKind = ModuleKind | "table";

export type ObjectEnvironmentDefinition = {
  schema: string;
  name: string;
  kind: InspectorObjectKind;
  text: string | null;
  unavailableReason: string | null;
};

function assertInspectorObjectKind(kind: string): InspectorObjectKind {
  if (
    kind === "storedProcedure" ||
    kind === "function" ||
    kind === "view" ||
    kind === "table"
  ) {
    return kind;
  }
  throw new Error("Object kind must be a stored procedure, function, view, or table.");
}

export async function getObjectDefinitionForEnvironment(input: {
  schema: string;
  name: string;
  kind: InspectorObjectKind;
  env: string;
}): Promise<ObjectEnvironmentDefinition> {
  await requireFeature("employers");
  const kind = assertInspectorObjectKind(input.kind);
  const env = parseEnvironmentName(input.env);
  if (!env) {
    throw new Error(`Unknown environment: ${input.env}`);
  }
  const db = await getHrmsDb(env);
  if (kind === "table") {
    const definition = await getTableDefinitionFromDb(db, {
      schema: input.schema,
      name: input.name,
    });
    const schema = input.schema.trim() || "dbo";
    const name = input.name.trim();
    return {
      schema,
      name,
      kind,
      text: definition.found ? definition.lines.join("\n") : null,
      unavailableReason: definition.found
        ? null
        : `Unable to find table ${schema}.${name}.`,
    };
  }
  const definition = await getModuleDefinitionFromDb(db, {
    schema: input.schema,
    name: input.name,
    kind,
  });
  return {
    schema: definition.schema,
    name: definition.name,
    kind: definition.kind,
    text: definition.definition,
    unavailableReason: definition.unavailableReason,
  };
}

export async function getModuleDefinition(input: {
  schema: string;
  name: string;
  kind: ModuleKind;
}): Promise<ModuleDefinition> {
  await requireFeature("employers");
  return getModuleDefinitionFromDb(await getHrmsDb(), input);
}

export type ResolvedScript =
  | {
      schema: string;
      name: string;
      kind: ModuleKind;
      definition: string | null;
      unavailableReason: string | null;
    }
  | {
      schema: string;
      name: string;
      kind: "table";
      columns: Array<{ name: string; typeName: string }>;
    };

export async function resolveScriptObject(input: {
  schema: string;
  name: string;
}): Promise<ResolvedScript | null> {
  await requireFeature("employers");
  const db = await getHrmsDb();
  const found = await findScriptObject(db, input);
  if (!found) {
    return null;
  }
  if (found.kind === "table") {
    const columns = await listTableColumnsFromDb(db, found.name, found.schema);
    return {
      schema: found.schema,
      name: found.name,
      kind: "table",
      columns: columns.map((column) => ({
        name: column.name,
        typeName: column.typeName,
      })),
    };
  }
  const definition = await getModuleDefinitionFromDb(db, {
    schema: found.schema,
    name: found.name,
    kind: found.kind,
  });
  return {
    schema: definition.schema,
    name: definition.name,
    kind: definition.kind,
    definition: definition.definition,
    unavailableReason: definition.unavailableReason,
  };
}

export type InspectorTableColumn = {
  name: string;
  type: string;
  length: string;
  nullable: boolean;
  identity: boolean;
  primaryKey: boolean;
  foreignKey: boolean;
};

export async function listInspectorTableColumns(input: {
  schema: string;
  name: string;
}): Promise<InspectorTableColumn[]> {
  await requireFeature("employers");
  const columns = await listTableColumnDefinitionsFromDb(await getHrmsDb(), input);
  return columns.map((column) => ({
    name: column.name,
    type: formatTableType(column),
    length: formatTableLength(column),
    nullable: column.nullable,
    identity: column.identity,
    primaryKey: column.primaryKey,
    foreignKey: column.foreignKey,
  }));
}

export async function resolveScriptObjectKinds(
  objects: ReadonlyArray<{ schema: string; name: string }>,
): Promise<Array<{ schema: string; name: string; kind: ScriptObjectKind }>> {
  await requireFeature("employers");
  if (objects.length === 0) {
    return [];
  }
  return findScriptObjectKinds(await getHrmsDb(), objects);
}
