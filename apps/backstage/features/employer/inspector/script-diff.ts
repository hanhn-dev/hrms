import { diffLines, diffWordsWithSpace } from "diff";

export type DiffSpan = {
  text: string;
  changed: boolean;
};

export type DiffRowKind = "equal" | "added" | "removed" | "changed";

export type DiffRow = {
  kind: DiffRowKind;
  left: DiffSpan[] | null;
  right: DiffSpan[] | null;
};

export type DefinitionDiff = {
  rows: DiffRow[];
  changedLineCount: number;
  identical: boolean;
};

export type DiffPlace = {
  startRow: number;
  lineCount: number;
  leftLine: number | null;
  rightLine: number | null;
  preview: string;
};

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function splitLines(text: string): string[] {
  if (text === "") {
    return [];
  }
  const parts = text.split("\n");
  if (text.endsWith("\n")) {
    parts.pop();
  }
  return parts;
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

function equalRow(line: string): DiffRow {
  const spans = plainSpans(line, false);
  return { kind: "equal", left: spans, right: spans };
}

export function diffDefinitions(left: string, right: string): DefinitionDiff {
  const leftText = normalizeNewlines(left);
  const rightText = normalizeNewlines(right);
  if (leftText === rightText) {
    return {
      rows: splitLines(leftText).map(equalRow),
      changedLineCount: 0,
      identical: true,
    };
  }

  const changes = diffLines(leftText, rightText);
  const rows: DiffRow[] = [];
  let index = 0;
  while (index < changes.length) {
    const change = changes[index];
    if (!change || change.added || change.removed) {
      const removed: string[] = [];
      const added: string[] = [];
      while (index < changes.length) {
        const next = changes[index];
        if (!next || (!next.added && !next.removed)) {
          break;
        }
        const lines = splitLines(next.value);
        if (next.removed) {
          removed.push(...lines);
        } else {
          added.push(...lines);
        }
        index += 1;
      }
      const paired = Math.min(removed.length, added.length);
      for (let pair = 0; pair < paired; pair += 1) {
        const leftLine = removed[pair] ?? "";
        const rightLine = added[pair] ?? "";
        const leftSpans = wordSpans(leftLine, rightLine, "left");
        const rightSpans = wordSpans(leftLine, rightLine, "right");
        const changed =
          leftSpans.some((span) => span.changed) ||
          rightSpans.some((span) => span.changed);
        rows.push({
          kind: changed ? "changed" : "equal",
          left: leftSpans,
          right: rightSpans,
        });
      }
      for (const line of removed.slice(paired)) {
        rows.push({ kind: "removed", left: plainSpans(line, true), right: null });
      }
      for (const line of added.slice(paired)) {
        rows.push({ kind: "added", left: null, right: plainSpans(line, true) });
      }
      continue;
    }
    for (const line of splitLines(change.value)) {
      rows.push(equalRow(line));
    }
    index += 1;
  }

  const changedLineCount = rows.filter((row) => row.kind !== "equal").length;
  return {
    rows,
    changedLineCount,
    identical: changedLineCount === 0,
  };
}

const PREVIEW_LIMIT = 80;

function spanText(spans: DiffSpan[] | null): string {
  return (spans ?? []).map((span) => span.text).join("");
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function clip(text: string): string {
  if (text.length <= PREVIEW_LIMIT) {
    return text;
  }
  return `${text.slice(0, PREVIEW_LIMIT - 1)}…`;
}

function placePreview(row: DiffRow): string {
  if (row.kind === "changed") {
    const left = compact(spanText((row.left ?? []).filter((span) => span.changed)));
    const right = compact(spanText((row.right ?? []).filter((span) => span.changed)));
    if (left || right) {
      return clip(left && right ? `${left} → ${right}` : left || right);
    }
  }
  const line = compact(
    spanText(row.kind === "removed" ? row.left : row.right) ||
      spanText(row.left) ||
      spanText(row.right),
  );
  return line ? clip(line) : "";
}

export function diffPlaces(rows: readonly DiffRow[]): DiffPlace[] {
  const places: DiffPlace[] = [];
  let leftLine = 0;
  let rightLine = 0;
  let place: DiffPlace | null = null;

  rows.forEach((row, index) => {
    const thisLeft = row.left ? (leftLine += 1) : null;
    const thisRight = row.right ? (rightLine += 1) : null;
    if (row.kind === "equal") {
      place = null;
      return;
    }
    if (!place) {
      place = {
        startRow: index,
        lineCount: 0,
        leftLine: thisLeft,
        rightLine: thisRight,
        preview: "",
      };
      places.push(place);
    }
    place.lineCount += 1;
    if (place.leftLine === null && thisLeft !== null) {
      place.leftLine = thisLeft;
    }
    if (place.rightLine === null && thisRight !== null) {
      place.rightLine = thisRight;
    }
    if (!place.preview) {
      place.preview = placePreview(row);
    }
  });

  return places;
}
