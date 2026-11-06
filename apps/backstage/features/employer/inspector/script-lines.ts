function withoutCarriageReturn(text: string): string {
  return text.replace(/\r/g, "");
}

function isSkippable(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

function displayedLines(text: string): string[] {
  return text.split("\n");
}

type SourceChar = {
  char: string;
  line: number;
};

function sourceChars(text: string): SourceChar[] {
  const chars: SourceChar[] = [];
  let line = 1;
  for (const char of text) {
    if (char === "\n") {
      line += 1;
      continue;
    }
    if (char === " " || char === "\t" || char === "\r") {
      continue;
    }
    chars.push({ char, line });
  }
  return chars;
}

export function originalLineCount(text: string): number {
  return text.split("\n").length;
}

export function originalLineAt(
  lines: readonly (number | null)[],
  displayedLine: number | null,
): number | null {
  if (displayedLine == null || displayedLine < 1) {
    return null;
  }
  return lines[displayedLine - 1] ?? null;
}

export function originalLineForDisplayedLines(
  original: string,
  displayed: string,
): (number | null)[] {
  const lines = displayedLines(displayed);
  if (withoutCarriageReturn(original) === withoutCarriageReturn(displayed)) {
    return lines.map((_, index) => index + 1);
  }

  const source = sourceChars(withoutCarriageReturn(original));
  let sourceIndex = 0;
  let mismatched = false;
  const numbers: (number | null)[] = [];

  for (const lineText of lines) {
    if (mismatched) {
      numbers.push(null);
      continue;
    }

    let assigned: number | null = null;
    for (const char of lineText) {
      if (isSkippable(char)) {
        continue;
      }
      const next = source[sourceIndex];
      if (!next || next.char !== char) {
        mismatched = true;
        break;
      }
      if (assigned == null) {
        assigned = next.line;
      }
      sourceIndex += 1;
    }
    numbers.push(assigned);
  }

  return numbers;
}
