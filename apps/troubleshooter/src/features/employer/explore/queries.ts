"use server";

import {
  listTables as listTablesFromDb,
  listTableColumns as listTableColumnsFromDb,
  searchValueInTables as searchValueInTablesFromDb,
  type ExploreSearchInput,
  type ExploreSearchMode,
  type ExploreSearchTableResult,
  type ExploreTable,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  ExploreSearchInput,
  ExploreSearchMode,
  ExploreSearchTableResult,
  ExploreTable,
};

export async function listTables(q?: string): Promise<ExploreTable[]> {
  await requireRootAdmin();
  return listTablesFromDb(await getHrmsDb(), { q });
}

export async function listTableColumns(tableName: string) {
  await requireRootAdmin();
  return listTableColumnsFromDb(await getHrmsDb(), tableName);
}

export async function searchValueInTables(
  input: ExploreSearchInput,
): Promise<ExploreSearchTableResult[]> {
  await requireRootAdmin();
  return searchValueInTablesFromDb(await getHrmsDb(), input);
}
