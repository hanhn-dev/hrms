import { captureQueryScript } from "@hrms/db";
import { FieldsPanel } from "@/features/employer/fields/fields-panel";
import type { FieldSource } from "@/features/employer/fields/fields-source";
import { PublicFieldsPanel } from "@/features/employer/fields/public-fields-panel";
import { DEFAULT_FIELD_ENTITIES } from "@/features/employer/fields/section-list";
import {
  compareEmployerFieldsToTemplate,
  listEmployerFieldSections,
  listEmployerFieldsForCompare,
  listFieldTemplateForCompare,
  listFieldTemplateSections,
  listFieldTypes,
  listPublicFieldSections,
} from "@/features/employer/fields/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function FieldsSourceSlot({
  employerId,
  source,
  section,
  field,
  listSearch,
}: {
  employerId: number;
  source: FieldSource;
  section: string | null;
  field: string | null;
  listSearch: string;
}): Promise<React.JSX.Element> {
  const summaryFilters = {
    q: listSearch,
    section,
    entities: [...DEFAULT_FIELD_ENTITIES],
  };
  if (source === "template") {
    const templateSections = await listFieldTemplateSections(summaryFilters);
    return (
      <FieldsPanel
        compareBounded
        compareScript=""
        compared={[]}
        employerFields={[]}
        employerId={employerId}
        field={field}
        fieldSections={templateSections}
        fieldTypes={[]}
        listSearch={listSearch}
        section={section}
        source={source}
        templateFields={[]}
        writesEnabled={false}
      />
    );
  }

  if (source === "public") {
    const [publicSections, writesEnabled] = await Promise.all([
      listPublicFieldSections(employerId, { q: listSearch, section }),
      getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
    ]);
    return (
      <PublicFieldsPanel
        employerId={employerId}
        field={field}
        fieldSections={publicSections}
        listSearch={listSearch}
        section={section}
        writesEnabled={writesEnabled}
      />
    );
  }

  if (source === "compare") {
    const compareFilters = { q: listSearch, section };
    const [employerFields, templateFields] = await Promise.all([
      captureQueryScript(() => listEmployerFieldsForCompare(employerId, compareFilters)),
      captureQueryScript(() => listFieldTemplateForCompare(compareFilters)),
    ]);
    return (
      <FieldsPanel
        compareBounded={Boolean(section?.trim()) || listSearch.trim().length >= 2}
        compareScript={[employerFields.script, templateFields.script]
          .filter((script) => script.trim() !== "")
          .join("\n\n")}
        compared={compareEmployerFieldsToTemplate(
          employerFields.result,
          templateFields.result,
        )}
        employerFields={employerFields.result}
        employerId={employerId}
        field={field}
        fieldSections={[]}
        fieldTypes={[]}
        listSearch={listSearch}
        section={section}
        source={source}
        templateFields={templateFields.result}
        writesEnabled={false}
      />
    );
  }

  const [fieldSections, fieldTypes, writesEnabled] = await Promise.all([
    listEmployerFieldSections(employerId, summaryFilters),
    listFieldTypes(),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);
  return (
    <FieldsPanel
      compareBounded
      compareScript=""
      compared={[]}
      employerFields={[]}
      employerId={employerId}
      field={field}
      fieldSections={fieldSections}
      fieldTypes={fieldTypes}
      listSearch={listSearch}
      section={section}
      source={source}
      templateFields={[]}
      writesEnabled={writesEnabled}
    />
  );
}
