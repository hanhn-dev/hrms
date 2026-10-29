import type { GitFilePair } from "@hrms/azure-devops";

export type FileCompareView =
  | { readonly kind: "notice"; readonly message: string }
  | {
      readonly kind: "one-sided";
      readonly message: string;
      readonly content: string;
      readonly truncated: boolean;
      readonly present: "left" | "right";
    }
  | { readonly kind: "diff" };

export function fileCompareView(pair: GitFilePair, leftLabel: string, rightLabel: string): FileCompareView {
  if (pair.base.isBinary || pair.target.isBinary) {
    return {
      kind: "notice",
      message: pair.base.omission ?? pair.target.omission ?? "Binary or non-text content omitted",
    };
  }

  const blocked = [pair.base, pair.target].filter(
    (side) => side.omission !== null && !side.missing && side.content === null,
  );
  if (blocked.length > 0) {
    return {
      kind: "notice",
      message: blocked
        .map((side) => side.omission)
        .filter((note): note is string => note !== null)
        .join("; "),
    };
  }

  if (pair.base.missing && pair.target.missing) {
    return { kind: "notice", message: "This path is not on either branch." };
  }
  if (pair.target.missing) {
    return {
      kind: "one-sided",
      message: `This file is on ${leftLabel} and is not on ${rightLabel}.`,
      content: pair.base.content ?? "",
      truncated: pair.base.truncated,
      present: "left",
    };
  }
  if (pair.base.missing) {
    return {
      kind: "one-sided",
      message: `This file is on ${rightLabel} and is not on ${leftLabel}.`,
      content: pair.target.content ?? "",
      truncated: pair.target.truncated,
      present: "right",
    };
  }
  return { kind: "diff" };
}
