export type SectionGridColumn = {
  kind: "value" | "lookup-name" | "lookup-id";
  title: string;
  displayText: string;
};

function lookupIdTitle(displayText: string): string {
  if (/\sid$/i.test(displayText.trim())) return displayText;
  return `${displayText} Id`;
}

/** Name plus a separate id column when any row resolved a master id. */
export function sectionGridColumns(
  fields: readonly { displayText: string }[],
  rows: readonly { lookups: Readonly<Record<string, unknown>> }[],
): SectionGridColumn[] {
  return fields.flatMap((field): SectionGridColumn[] => {
    const hasLookup = rows.some((row) => row.lookups[field.displayText] != null);
    if (!hasLookup) {
      return [
        {
          kind: "value" as const,
          title: field.displayText,
          displayText: field.displayText,
        },
      ];
    }
    return [
      {
        kind: "lookup-name" as const,
        title: field.displayText,
        displayText: field.displayText,
      },
      {
        kind: "lookup-id" as const,
        title: lookupIdTitle(field.displayText),
        displayText: field.displayText,
      },
    ];
  });
}
