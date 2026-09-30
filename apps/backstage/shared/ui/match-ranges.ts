const MIN_TOKEN_LENGTH = 2;

export function matchRanges(text: string, query: string): Array<[number, number]> {
  const tokens = [
    ...new Set(
      query
        .trim()
        .split(/\s+/)
        .filter((token) => token.length >= MIN_TOKEN_LENGTH)
        .map((token) => token.toLowerCase()),
    ),
  ];
  if (tokens.length === 0 || text.length === 0) {
    return [];
  }

  const lower = text.toLowerCase();
  const found: Array<[number, number]> = [];
  for (const token of tokens) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(token, from);
      if (index === -1) {
        break;
      }
      found.push([index, index + token.length]);
      from = index + token.length;
    }
  }

  found.sort((left, right) => left[0] - right[0] || right[1] - left[1]);
  const merged: Array<[number, number]> = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (!last || range[0] > last[1]) {
      merged.push([range[0], range[1]]);
      continue;
    }
    if (range[1] > last[1]) {
      last[1] = range[1];
    }
  }
  return merged;
}
