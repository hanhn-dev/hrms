import { captureQueryScript } from "@hrms/db";
import { FieldsPanel } from "@/features/employer/fields/fields-panel";
import type { FieldSource } from "@/features/employer/fields/fields-source";
import { PublicFieldsPanel } from "@/features/employer/fields/public-fields-panel";
import {
  compareEmployerFieldsToTemplate,
  listEmployerFields,
  listEmployerFieldsForCompare,
  listFieldTemplate,
  listFieldTemplateForCompare,
  listFieldTypes,
  listPublicEmployerFields,
} from "@/features/employer/fields/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function FieldsSourceSlot({
  employerId,
  source,
  section,
  field,
  listPage,
  listSearch,
}: {
  employerId: number;
  source: FieldSource;
  section: string | null;
  field: string | null;
  listPage: number;
  listSearch: string;
}): Promise<React.JSX.Element> {
  const filters = { page: listPage, q: listSearch, section };
  if (source === "template") {
    const templateFields = await captureQueryScript(() => listFieldTemplate(filters));
    return (
      <FieldsPanel
        compareBounded
        compareScript=""
        compared={[]}
        employerFields={[]}
        employerId={employerId}
        employerScript=""
        field={field}
        fieldTypes={[]}
        listPage={templateFields.result.page}
        listSearch={listSearch}
        pageSize={templateFields.result.pageSize}
        section={section}
        source={source}
        templateFields={templateFields.result.rows}
        templateScript={templateFields.script}
        totalCount={templateFields.result.totalCount}
        writesEnabled={false}
      />
    );
  }

  if (source === "public") {
    const [publicFields, writesEnabled] = await Promise.all([
      captureQueryScript(() => listPublicEmployerFields(employerId, filters)),
      getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
    ]);
    return (
      <PublicFieldsPanel
        employerId={employerId}
        field={field}
        fields={publicFields.result.rows}
        listPage={publicFields.result.page}
        listSearch={listSearch}
        pageSize={publicFields.result.pageSize}
        queryScript={publicFields.script}
        section={section}
        totalCount={publicFields.result.totalCount}
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
        employerScript={employerFields.script}
        field={field}
        fieldTypes={[]}
        listPage={1}
        listSearch={listSearch}
        pageSize={employerFields.result.length}
        section={section}
        source={source}
        templateFields={templateFields.result}
        templateScript={templateFields.script}
        totalCount={0}
        writesEnabled={false}
      />
    );
  }

  const [employerFields, fieldTypes, writesEnabled] = await Promise.all([
    captureQueryScript(() => listEmployerFields(employerId, filters)),
    listFieldTypes(),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);
  return (
    <FieldsPanel
      compareBounded
      compareScript=""
      compared={[]}
      employerFields={employerFields.result.rows}
      employerId={employerId}
      employerScript={employerFields.script}
      field={field}
      fieldTypes={fieldTypes}
      listPage={employerFields.result.page}
      listSearch={listSearch}
      pageSize={employerFields.result.pageSize}
      section={section}
      source={source}
      templateFields={[]}
      templateScript=""
      totalCount={employerFields.result.totalCount}
      writesEnabled={writesEnabled}
    />
  );
}
