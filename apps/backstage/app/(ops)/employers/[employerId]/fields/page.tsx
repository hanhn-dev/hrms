import { FieldsScreen } from "@/features/employer/fields";
import { parseFieldFocus, parseFieldSource } from "@/features/employer/fields/fields-source";
import { parsePositiveInt } from "@/shared/routing";

export default async function FieldsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ source?: string; section?: string; field?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <FieldsScreen
      employerId={parsePositiveInt(employerId)}
      field={parseFieldFocus(query.field)}
      section={parseFieldFocus(query.section)}
      source={parseFieldSource(query.source)}
    />
  );
}
