"use server";

import {
  browseDataFixTable,
  captureQueryScript,
  loadDataFixColumn,
  searchDataFixColumns,
  searchDataFixTables,
  type ColumnFilterInput,
  type DataFixBrowse,
  type DataFixColumnHit,
  type DataFixColumnTarget,
  type DataFixTableHit,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { ColumnFilterInput, DataFixBrowse, DataFixColumnHit, DataFixColumnTarget, DataFixTableHit };

export async function searchColumns(
  query: string,
): Promise<{ hits: DataFixColumnHit[]; queryScript: string }> {
  await requireRootAdmin();
  const db = await getHrmsDb();
  const loaded = await captureQueryScript(() => searchDataFixColumns(db, query));
  return { hits: loaded.result, queryScript: loaded.script };
}

export async function searchTables(
  query: string,
): Promise<{ hits: DataFixTableHit[]; queryScript: string }> {
  await requireRootAdmin();
  const db = await getHrmsDb();
  const loaded = await captureQueryScript(() => searchDataFixTables(db, query));
  return { hits: loaded.result, queryScript: loaded.script };
}

export async function browseTable(input: {
  employerId: number;
  schema: string;
  table: string;
  value: string;
  newestFirst?: boolean;
  columnFilters?: ColumnFilterInput[];
}): Promise<DataFixBrowse & { queryScript: string }> {
  await requireRootAdmin();
  const db = await getHrmsDb();
  const loaded = await captureQueryScript(() => browseDataFixTable(db, input));
  return { ...loaded.result, queryScript: loaded.script };
}

export async function openColumn(input: {
  schema: string;
  table: string;
  column: string;
}): Promise<DataFixColumnTarget | null> {
  await requireRootAdmin();
  return loadDataFixColumn(await getHrmsDb(), input);
}
