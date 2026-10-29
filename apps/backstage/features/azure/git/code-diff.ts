import { diffWordsWithSpace, structuredPatch } from "diff";

const CONTEXT_LINES = 3;
const PREVIEW_LIMIT = 80;

export type DiffSpan = {
  text: string;
  changed: boolean;
};

export type CodeDiffRowKind = "equal" | "added" | "removed" | "changed";

export type CodeDiffRow = {
  kind: CodeDiffRowKind;
  leftLine: number | null;
  rightLine: number | null;
  left: DiffSpan[] | null;
  right: DiffSpan[] | null;
};

export type CodeDiffHunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  rows: CodeDiffRow[];
  preview: string;
};

export type CodeDiff = {
  identical: boolean;
  addedLineCount: number;
  removedLineCount: number;
  hunks: CodeDiffHunk[];
};

export function diffCode(left: string, right: string): CodeDiff {
  const leftText = normalizeNewlines(left);
  const rightText = normalizeNewlines(right);
  if (leftText === rightText) {
    return { identical: true, addedLineCount: 0, removedLineCount: 0, hunks: [] };
  }

  const patch = structuredPatch("a", "b", leftText, rightText, undefined, undefined, {
    context: CONTEXT_LINES,
  });
  const hunks = patch.hunks.map(mapHunk);
  let addedLineCount = 0;
  let removedLineCount = 0;
  for (const hunk of hunks) {
    for (const row of hunk.rows) {
      if (row.kind === "added" || row.kind === "changed") {
        addedLineCount += 1;
      }
      if (row.kind === "removed" || row.kind === "changed") {
        removedLineCount += 1;
      }
    }
  }

  return {
    identical: addedLineCount === 0 && removedLineCount === 0,
    addedLineCount,
    removedLineCount,
    hunks,
  };
}

function mapHunk(hunk: {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}): CodeDiffHunk {
  const rows: CodeDiffRow[] = [];
  let leftLine = hunk.oldStart;
  let rightLine = hunk.newStart;
  let index = 0;

  while (index < hunk.lines.length) {
    const line = hunk.lines[index] ?? "";
    const kind = lineKind(line);
    if (kind === "meta") {
      index += 1;
      continue;
    }
    if (kind === "context") {
      const text = lineBody(line);
      const left = takeLine(leftLine);
      const right = takeLine(rightLine);
      leftLine = left.next;
      rightLine = right.next;
      rows.push({
        kind: "equal",
        leftLine: left.line,
        rightLine: right.line,
        left: plainSpans(text, false),
        right: plainSpans(text, false),
      });
      index += 1;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (index < hunk.lines.length) {
      const next = hunk.lines[index] ?? "";
      const nextKind = lineKind(next);
      if (nextKind === "context" || nextKind === "meta") {
        break;
      }
      if (nextKind === "remove") {
        removed.push(lineBody(next));
      } else {
        added.push(lineBody(next));
      }
      index += 1;
    }

    const paired = Math.min(removed.length, added.length);
    for (let pair = 0; pair < paired; pair += 1) {
      const leftText = removed[pair] ?? "";
      const rightText = added[pair] ?? "";
      const leftSpans = wordSpans(leftText, rightText, "left");
      const rightSpans = wordSpans(leftText, rightText, "right");
      const changed = leftSpans.some((span) => span.changed) || rightSpans.some((span) => span.changed);
      const left = takeLine(leftLine);
      const right = takeLine(rightLine);
      leftLine = left.next;
      rightLine = right.next;
      rows.push({
        kind: changed ? "changed" : "equal",
        leftLine: left.line,
        rightLine: right.line,
        left: leftSpans,
        right: rightSpans,
      });
    }
    for (const text of removed.slice(paired)) {
      const left = takeLine(leftLine);
      leftLine = left.next;
      rows.push({
        kind: "removed",
        leftLine: left.line,
        rightLine: null,
        left: plainSpans(text, true),
        right: null,
      });
    }
    for (const text of added.slice(paired)) {
      const right = takeLine(rightLine);
      rightLine = right.next;
      rows.push({
        kind: "added",
        leftLine: null,
        rightLine: right.line,
        left: null,
        right: plainSpans(text, true),
      });
    }
  }

  return {
    oldStart: hunk.oldStart,
    oldLines: hunk.oldLines,
    newStart: hunk.newStart,
    newLines: hunk.newLines,
    rows,
    preview: previewOf(rows),
  };
}

function lineKind(line: string): "context" | "add" | "remove" | "meta" {
  if (line.startsWith("\\")) {
    return "meta";
  }
  if (line.startsWith("+")) {
    return "add";
  }
  if (line.startsWith("-")) {
    return "remove";
  }
  return "context";
}

function lineBody(line: string): string {
  return line.startsWith("+") || line.startsWith("-") || line.startsWith(" ") ? line.slice(1) : line;
}

function takeLine(current: number): { line: number; next: number } {
  const line = current <= 0 ? 1 : current;
  return { line, next: line + 1 };
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function plainSpans(text: string, changed: boolean): DiffSpan[] {
  return [{ text, changed }];
}

function wordSpans(left: string, right: string, side: "left" | "right"): DiffSpan[] {
  const parts = diffWordsWithSpace(left, right);
  const spans: DiffSpan[] = [];
  for (const part of parts) {
    const include = side === "left" ? !part.added : !part.removed;
    if (!include || part.value.length === 0) {
      continue;
    }
    const changed = side === "left" ? part.removed : part.added;
    const previous = spans[spans.length - 1];
    if (previous && previous.changed === changed) {
      previous.text += part.value;
      continue;
    }
    spans.push({ text: part.value, changed });
  }
  return spans.length > 0 ? spans : plainSpans(side === "left" ? left : right, false);
}

function spanText(spans: DiffSpan[] | null): string {
  return (spans ?? []).map((span) => span.text).join("");
}

function previewOf(rows: readonly CodeDiffRow[]): string {
  const row = rows.find((candidate) => candidate.kind !== "equal");
  if (!row) {
    return "";
  }
  const text = spanText(row.kind === "removed" ? row.left : row.right) || spanText(row.left) || spanText(row.right);
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= PREVIEW_LIMIT) {
    return compact;
  }
  return `${compact.slice(0, PREVIEW_LIMIT - 1)}…`;
}
