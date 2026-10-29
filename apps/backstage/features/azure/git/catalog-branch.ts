export const DEV_BRANCH_NAME = "Dev";

export function resolveCatalogBranch(
  branches: readonly { name: string; commitId: string }[],
  fallbackName: string,
): { name: string; commitId: string } | null {
  const dev = branches.find(
    (item) => item.name.localeCompare(DEV_BRANCH_NAME, undefined, { sensitivity: "base" }) === 0,
  );
  if (dev) {
    return dev;
  }
  const fallback = branches.find((item) => item.name === fallbackName);
  return fallback ?? null;
}
