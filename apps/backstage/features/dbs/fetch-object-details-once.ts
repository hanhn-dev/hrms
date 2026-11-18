"use client";

import {
  fetchObjectDetails,
  type DatabaseObjectDetails,
} from "@/features/dbs/queries";

/** Dedupe identical in-flight detail requests across Strict Mode / remounts. */
const inflightDetailRequests = new Map<
  string,
  Promise<DatabaseObjectDetails>
>();

export function fetchObjectDetailsOnce(
  input: Parameters<typeof fetchObjectDetails>[0],
): Promise<DatabaseObjectDetails> {
  const key = [
    input.kind,
    input.schema,
    input.name,
    input.includeRelationships ?? true,
    input.includeDefinition ?? true,
    input.includeDependencies ?? true,
    input.includeDependents ?? false,
    input.includeStructure ?? false,
  ].join("|");
  const existing = inflightDetailRequests.get(key);
  if (existing) {
    return existing;
  }
  const request = fetchObjectDetails(input).finally(() => {
    inflightDetailRequests.delete(key);
  });
  inflightDetailRequests.set(key, request);
  return request;
}
