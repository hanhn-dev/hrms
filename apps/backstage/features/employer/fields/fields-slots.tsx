import { captureQueryScript } from "@hrms/db";
import { FieldsPanel } from "@/features/employer/fields/fields-panel";
import type { FieldSource } from "@/features/employer/fields/fields-source";
import {
  compareEmployerFieldsToTemplate,
  listEmployerFields,
  listFieldTemplate,
  listFieldTypes,
} from "@/features/employer/fields/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function FieldsSourceSlot({
  employerId,
  source,
  section,
  field,
}: {
  employerId: number;
  source: FieldSource;
  section: string | null;
  field: string | null;
}): Promise<React.JSX.Element> {
  if (source === "template") {
    const templateFields = await captureQueryScript(() => listFieldTemplate());
    return (
      <FieldsPanel
        compareScript=""
        compared={[]}
        employerFields={[]}
        employerId={employerId}
        employerScript=""
        field={field}
        fieldTypes={[]}
        section={section}
        source={source}
        templateFields={templateFields.result}
        templateScript={templateFields.script}
        writesEnabled={false}
      />
    );
  }

  if (source === "compare") {
    const [employerFields, templateFields] = await Promise.all([
      captureQueryScript(() => listEmployerFields(employerId)),
      captureQueryScript(() => listFieldTemplate()),
    ]);
    return (
      <FieldsPanel
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
        section={section}
        source={source}
        templateFields={templateFields.result}
        templateScript={templateFields.script}
        writesEnabled={false}
      />
    );
  }

  const [employerFields, fieldTypes, writesEnabled] = await Promise.all([
    captureQueryScript(() => listEmployerFields(employerId)),
    listFieldTypes(),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);
  return (
    <FieldsPanel
      compareScript=""
      compared={[]}
      employerFields={employerFields.result}
      employerId={employerId}
      employerScript={employerFields.script}
      field={field}
      fieldTypes={fieldTypes}
      section={section}
      source={source}
      templateFields={[]}
      templateScript=""
      writesEnabled={writesEnabled}
    />
  );
}
