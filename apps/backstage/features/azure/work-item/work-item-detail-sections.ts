export type WorkItemDetailSection = {
  key: "description" | "repro-steps" | "acceptance-criteria";
  title: string;
  content: string;
};

type WorkItemDetailSectionFields = {
  description: string;
  reproSteps: string;
  acceptanceCriteria: string;
};

const SECTION_DEFS: readonly {
  key: WorkItemDetailSection["key"];
  title: string;
  field: keyof WorkItemDetailSectionFields;
}[] = [
  { key: "description", title: "Description", field: "description" },
  { key: "repro-steps", title: "Repro steps", field: "reproSteps" },
  {
    key: "acceptance-criteria",
    title: "Acceptance criteria",
    field: "acceptanceCriteria",
  },
];

/** Ordered non-empty markdown sections for the work-item detail modal. */
export function workItemDetailSections(
  fields: WorkItemDetailSectionFields,
): WorkItemDetailSection[] {
  const sections: WorkItemDetailSection[] = [];
  for (const def of SECTION_DEFS) {
    const content = fields[def.field];
    if (!content.trim()) {
      continue;
    }
    sections.push({ key: def.key, title: def.title, content });
  }
  return sections;
}
