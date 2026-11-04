import type { PullRequestCandidate } from "@hrms/azure-devops";

export type MemberPullRequestStatusCounts = {
  active: number;
  completed: number;
  abandoned: number;
};

export type MemberPullRequestProgress = {
  displayName: string;
  authorId: string | null;
  opened: number;
  byStatus: MemberPullRequestStatusCounts;
  pullRequests: PullRequestCandidate[];
};

export type TeamPullRequestSummary = {
  totalOpened: number;
  byStatus: MemberPullRequestStatusCounts;
};

function emptyStatusCounts(): MemberPullRequestStatusCounts {
  return { active: 0, completed: 0, abandoned: 0 };
}

function bumpStatus(
  counts: MemberPullRequestStatusCounts,
  status: string,
): void {
  const key = status.trim().toLowerCase();
  if (key === "active") {
    counts.active += 1;
    return;
  }
  if (key === "completed") {
    counts.completed += 1;
    return;
  }
  if (key === "abandoned") {
    counts.abandoned += 1;
  }
}

function emptyMember(
  displayName: string,
  authorId: string | null,
): MemberPullRequestProgress {
  return {
    displayName,
    authorId,
    opened: 0,
    byStatus: emptyStatusCounts(),
    pullRequests: [],
  };
}

/**
 * Group PR candidates onto a roster of display names.
 * Matching prefers authorId when the roster entry has one; otherwise displayName.
 * Roster order is preserved. Unknown authors are ignored (not appended).
 */
export function aggregatePullRequestsByMember(
  roster: readonly { displayName: string; authorId: string | null }[],
  candidates: readonly PullRequestCandidate[],
): MemberPullRequestProgress[] {
  const rows = roster.map((entry) =>
    emptyMember(entry.displayName, entry.authorId),
  );
  const byId = new Map<string, MemberPullRequestProgress>();
  const byName = new Map<string, MemberPullRequestProgress>();
  for (const row of rows) {
    byName.set(row.displayName, row);
    byName.set(row.displayName.toLowerCase(), row);
    if (row.authorId != null && row.authorId.length > 0) {
      byId.set(row.authorId, row);
    }
  }

  for (const candidate of candidates) {
    const authorName = candidate.author?.trim() ?? "";
    const row =
      (candidate.authorId != null ? byId.get(candidate.authorId) : undefined) ??
      (authorName.length > 0
        ? (byName.get(authorName) ?? byName.get(authorName.toLowerCase()))
        : undefined);
    if (row == null) {
      continue;
    }
    row.pullRequests.push(candidate);
    row.opened += 1;
    bumpStatus(row.byStatus, candidate.status);
  }

  for (const row of rows) {
    row.pullRequests.sort((left, right) => {
      const leftDay = left.openedDate ?? "";
      const rightDay = right.openedDate ?? "";
      return rightDay.localeCompare(leftDay);
    });
  }

  return rows;
}

export function summarizeTeamPullRequests(
  rows: readonly MemberPullRequestProgress[],
): TeamPullRequestSummary {
  const byStatus = emptyStatusCounts();
  let totalOpened = 0;
  for (const row of rows) {
    totalOpened += row.opened;
    byStatus.active += row.byStatus.active;
    byStatus.completed += row.byStatus.completed;
    byStatus.abandoned += row.byStatus.abandoned;
  }
  return { totalOpened, byStatus };
}

/** Keep roster order when filtering; empty selection returns all rows. */
export function filterPullRequestMembers(
  rows: readonly MemberPullRequestProgress[],
  selectedDisplayNames: readonly string[],
): MemberPullRequestProgress[] {
  const selected = selectedDisplayNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (selected.length === 0) {
    return [...rows];
  }
  const byName = new Map(rows.map((row) => [row.displayName, row]));
  const result: MemberPullRequestProgress[] = [];
  const seen = new Set<string>();
  for (const name of selected) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(byName.get(name) ?? emptyMember(name, null));
  }
  return result;
}

/** ISO / date string → YYYY-MM-DD, or null when invalid. */
export function toDateOnly(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const day = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}
