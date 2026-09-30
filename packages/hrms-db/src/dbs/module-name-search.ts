const MIN_TOKEN_LENGTH = 2;

export function moduleNameSearchTokens(query: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const part of query.trim().split(/\s+/)) {
    if (part.length < MIN_TOKEN_LENGTH) {
      continue;
    }
    const key = part.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tokens.push(part);
  }
  return tokens;
}

export function collapsedModuleNameQuery(query: string): string {
  return query.trim().replace(/\s+/g, "");
}
