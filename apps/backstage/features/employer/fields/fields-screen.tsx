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
import { PageHelp } from "@/shared/ui/shell-header-context";

export async function FieldsScreen({
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
  const [employerFields, templateFields, fieldTypes] = await Promise.all([
    listEmployerFields(employerId),
    listFieldTemplate(),
    listFieldTypes(),
  ]);
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  return (
    <>
      <PageHelp
        source="fields"
        notes={[
          {
            id: "hmac-confirm",
            type: "info",
            title: "Field writes use preview then confirm",
            description:
              "Row Save and ValidationRule both open a preview of the change. Commit writes a history snapshot, then updates TEmployeeDetail_Fields.",
          },
          {
            id: "fieldname-risk",
            type: "warning",
            title: "Renaming FieldName can break lookups",
            description:
              "My Details and compare match on FieldName. Changing it does not rewrite DB_Table/DB_Column.",
          },
          {
            id: "system-mandatory",
            type: "info",
            title: "System Mandatory stays locked",
            description:
              "Rows tagged System Mandatory cannot turn IsMandatory off. Other columns on that row are still editable.",
          },
          {
            id: "replay-sql",
            type: "info",
            title: "Replay SQL uses a natural key",
            description:
              "FieldID is not stable across environments. The copyable script matches EmployerId, section, country, current FieldName, and FieldEntity.",
          },
          {
            id: "fieldtype-json",
            type: "warning",
            title: "FieldType_JSON_SQL is not rewritten",
            description:
              "Changing FieldType updates FieldTypeID only. Control JSON on the field row stays as stored.",
          },
          {
            id: "template-readonly",
            type: "info",
            title: "Template and Compare are read-only",
            description:
              "Inline edit applies to Employer fields only.",
          },
        ]}
      />
      <FieldsPanel
        key={`${section ?? ""}:${field ?? ""}`}
        compared={compareEmployerFieldsToTemplate(employerFields, templateFields)}
        employerFields={employerFields}
        employerId={employerId}
        field={field}
        fieldTypes={fieldTypes}
        section={section}
        source={source}
        templateFields={templateFields}
        writesEnabled={writesEnabled}
      />
    </>
  );
}
