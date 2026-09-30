"use server";

import {
  findScriptObject,
  findScriptObjectKinds,
  getModuleDefinition as getModuleDefinitionFromDb,
  listEmployers as listEmployersFromDb,
  listModules as listModulesFromDb,
  listSearchTargets as listSearchTargetsFromDb,
  listTableColumns as listTableColumnsFromDb,
  searchValueExistence as searchValueExistenceFromDb,
  searchValueInTables as searchValueInTablesFromDb,
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
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

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
  await requireRootAdmin();
  const rows = await listEmployersFromDb(await getHrmsDb());
  return rows.map((row) => ({
    employerId: row.employerId,
    employerName: row.employerName,
  }));
}

export async function listSearchTargets(): Promise<SearchTarget[]> {
  await requireRootAdmin();
  return listSearchTargetsFromDb(await getHrmsDb());
}

export async function searchValueExistence(
  input: ExistenceSearchInput,
): Promise<ExistenceTableResult[]> {
  await requireRootAdmin();
  return searchValueExistenceFromDb(await getHrmsDb(), input);
}

export async function searchInspectorTable(input: {
  schema: string;
  table: string;
  value: string;
  mode: ExploreSearchMode;
  employerId: number | null;
}): Promise<ExploreSearchTableResult> {
  await requireRootAdmin();
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
  await requireRootAdmin();
  return listModulesFromDb(await getHrmsDb(), input);
}

export async function getModuleDefinition(input: {
  schema: string;
  name: string;
  kind: ModuleKind;
}): Promise<ModuleDefinition> {
  await requireRootAdmin();
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
  await requireRootAdmin();
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

export async function resolveScriptObjectKinds(
  objects: ReadonlyArray<{ schema: string; name: string }>,
): Promise<Array<{ schema: string; name: string; kind: ScriptObjectKind }>> {
  await requireRootAdmin();
  if (objects.length === 0) {
    return [];
  }
  return findScriptObjectKinds(await getHrmsDb(), objects);
}
