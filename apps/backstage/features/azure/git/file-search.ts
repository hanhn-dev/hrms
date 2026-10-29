export const GIT_PATH_RESULT_LIMIT = 20;

export type PreparedGitPath = {
  readonly path: string;
  readonly lower: string;
  readonly nameStart: number;
};

export type GitPathMatch = {
  readonly path: string;
  readonly score: number;
  readonly ranges: ReadonlyArray<readonly [number, number]>;
  readonly recent: boolean;
};

export function prepareGitPaths(paths: readonly string[]): PreparedGitPath[] {
  const prepared: PreparedGitPath[] = [];
  for (const path of paths) {
    if (path.length === 0) {
      continue;
    }
    const lower = path.toLowerCase();
    prepared.push({ path, lower, nameStart: lower.lastIndexOf("/") + 1 });
  }
  return prepared;
}

export function rankGitPaths(
  index: readonly PreparedGitPath[],
  query: string,
  limit = GIT_PATH_RESULT_LIMIT,
): GitPathMatch[] {
  return rankGitPathSuggestions({ index, recents: [], query, limit });
}

export function rankGitPathSuggestions(input: {
  index: readonly PreparedGitPath[];
  recents: readonly PreparedGitPath[];
  query: string;
  limit?: number;
}): GitPathMatch[] {
  const limit = input.limit ?? GIT_PATH_RESULT_LIMIT;
  const tokens = queryTokens(input.query);
  if (tokens.length === 0) {
    return input.recents.slice(0, limit).map((item) => ({
      path: item.path,
      score: 0,
      ranges: [],
      recent: true,
    }));
  }

  const recentPaths = new Set<string>();
  const recentMatches: GitPathMatch[] = [];
  for (const item of input.recents) {
    const score = scorePath(item, tokens);
    if (score === null) {
      continue;
    }
    recentPaths.add(item.path);
    recentMatches.push({
      path: item.path,
      score,
      ranges: collectRanges(item, tokens),
      recent: true,
    });
  }
  recentMatches.sort(compareMatches);
  const keptRecents = recentMatches.slice(0, limit);
  const room = limit - keptRecents.length;
  if (room <= 0) {
    return keptRecents;
  }

  const tree = topTreeMatches(input.index, tokens, room, recentPaths);
  return [...keptRecents, ...tree];
}

function queryTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function scorePath(item: PreparedGitPath, tokens: readonly string[]): number | null {
  let total = exactBonus(item, tokens);
  for (const token of tokens) {
    const nameScore = scoreSequence(item.lower, item.path, token, item.nameStart, item.lower.length);
    if (nameScore !== null) {
      total += nameScore + 40;
      continue;
    }
    const pathScore = scoreSequence(item.lower, item.path, token, 0, item.lower.length);
    if (pathScore === null) {
      return null;
    }
    total += pathScore;
  }
  return total;
}

function exactBonus(item: PreparedGitPath, tokens: readonly string[]): number {
  const token = tokens.length === 1 ? tokens[0] : undefined;
  if (token === undefined) {
    return 0;
  }
  if (item.lower === token || equalsSlice(item.lower, item.nameStart, token)) {
    return 1000;
  }
  return 0;
}

function equalsSlice(text: string, start: number, token: string): boolean {
  if (text.length - start !== token.length) {
    return false;
  }
  for (let index = 0; index < token.length; index += 1) {
    if (text.charAt(start + index) !== token.charAt(index)) {
      return false;
    }
  }
  return true;
}

function scoreSequence(text: string, original: string, token: string, from: number, to: number): number | null {
  let textIndex = from;
  let score = 0;
  let last = -1;
  for (let index = 0; index < token.length; index += 1) {
    const found = text.indexOf(token.charAt(index), textIndex);
    if (found < 0 || found >= to) {
      return null;
    }
    score += characterScore(original, found, last);
    last = found;
    textIndex = found + 1;
  }
  return score;
}

function characterScore(original: string, found: number, last: number): number {
  let gain = 1;
  if (last >= 0 && found === last + 1) {
    gain += 8;
  } else if (last >= 0) {
    gain -= Math.min(found - last - 1, 12);
  }
  if (isBoundary(original, found)) {
    gain += 6;
  }
  return gain;
}

function isBoundary(path: string, index: number): boolean {
  if (index <= 0) {
    return true;
  }
  const previous = path.charAt(index - 1);
  if (previous === "/" || previous === "." || previous === "_" || previous === "-" || previous === " ") {
    return true;
  }
  const current = path.charAt(index);
  return previous >= "a" && previous <= "z" && current >= "A" && current <= "Z";
}

function collectRanges(item: PreparedGitPath, tokens: readonly string[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    const nameRanges = sequenceRanges(item.lower, token, item.nameStart, item.lower.length);
    const tokenRanges = nameRanges ?? sequenceRanges(item.lower, token, 0, item.lower.length) ?? [];
    ranges.push(...tokenRanges);
  }
  return mergeRanges(ranges);
}

function sequenceRanges(text: string, token: string, from: number, to: number): Array<[number, number]> | null {
  let textIndex = from;
  let rangeStart = -1;
  let rangeEnd = -1;
  const ranges: Array<[number, number]> = [];
  for (let index = 0; index < token.length; index += 1) {
    const found = text.indexOf(token.charAt(index), textIndex);
    if (found < 0 || found >= to) {
      return null;
    }
    if (rangeStart < 0) {
      rangeStart = found;
      rangeEnd = found + 1;
    } else if (found === rangeEnd) {
      rangeEnd = found + 1;
    } else {
      ranges.push([rangeStart, rangeEnd]);
      rangeStart = found;
      rangeEnd = found + 1;
    }
    textIndex = found + 1;
  }
  if (rangeStart >= 0) {
    ranges.push([rangeStart, rangeEnd]);
  }
  return ranges;
}

function mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  ranges.sort((left, right) => left[0] - right[0] || right[1] - left[1]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
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

type ScoredPath = {
  item: PreparedGitPath;
  score: number;
};

function topTreeMatches(
  index: readonly PreparedGitPath[],
  tokens: readonly string[],
  limit: number,
  skip: ReadonlySet<string>,
): GitPathMatch[] {
  const top: ScoredPath[] = [];
  for (const item of index) {
    if (skip.has(item.path)) {
      continue;
    }
    const score = scorePath(item, tokens);
    if (score === null) {
      continue;
    }
    consider(top, { item, score }, limit);
  }
  return top.map((entry) => ({
    path: entry.item.path,
    score: entry.score,
    ranges: collectRanges(entry.item, tokens),
    recent: false,
  }));
}

function consider(top: ScoredPath[], candidate: ScoredPath, limit: number): void {
  if (top.length >= limit && !betterThan(candidate, top[top.length - 1]!)) {
    return;
  }
  if (top.length >= limit) {
    top.pop();
  }
  let index = top.length;
  while (index > 0 && betterThan(candidate, top[index - 1]!)) {
    index -= 1;
  }
  top.splice(index, 0, candidate);
}

function betterThan(candidate: ScoredPath, current: ScoredPath): boolean {
  if (candidate.score !== current.score) {
    return candidate.score > current.score;
  }
  if (candidate.item.path.length !== current.item.path.length) {
    return candidate.item.path.length < current.item.path.length;
  }
  return candidate.item.path.localeCompare(current.item.path) < 0;
}

function compareMatches(left: GitPathMatch, right: GitPathMatch): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }
  if (left.path.length !== right.path.length) {
    return left.path.length - right.path.length;
  }
  return left.path.localeCompare(right.path);
}
