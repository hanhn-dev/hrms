import type { WorkflowDefinitionStatus } from "./tree";
import { resolveWorkflowStatus } from "./tree";

export function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function splitCsvIds(value: string | null | undefined): number[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export function joinCsvIds(ids: number[]): string {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].join(",");
}

export function mappedPagesOverlap(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const rightIds = new Set(splitCsvIds(right));
  return splitCsvIds(left).some((id) => rightIds.has(id));
}

export function statusFromRow(input: {
  treeXml: string | null | undefined;
  isPartial: unknown;
}): WorkflowDefinitionStatus {
  return resolveWorkflowStatus({
    treeXml: input.treeXml,
    isPartial: asBool(input.isPartial),
  });
}
