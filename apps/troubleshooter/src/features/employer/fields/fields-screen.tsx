import { FieldsPanel } from "@/features/employer/fields/fields-panel";
import type { FieldSource } from "@/features/employer/fields/fields-source";
import {
  compareEmployerFieldsToTemplate,
  listEmployerFields,
  listFieldTemplate,
} from "@/features/employer/fields/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function FieldsScreen({
  employerId,
  source,
}: {
  employerId: number;
  source: FieldSource;
}): Promise<React.JSX.Element> {
  const [employerFields, templateFields] = await Promise.all([
    listEmployerFields(employerId),
    listFieldTemplate(),
  ]);
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  return (
    <FieldsPanel
      compared={compareEmployerFieldsToTemplate(employerFields, templateFields)}
      employerFields={employerFields}
      employerId={employerId}
      source={source}
      templateFields={templateFields}
      writesEnabled={writesEnabled}
    />
  );
}
