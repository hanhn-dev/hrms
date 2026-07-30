export function createEntityId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function createIsoTimestamp(): string {
  return new Date().toISOString();
}