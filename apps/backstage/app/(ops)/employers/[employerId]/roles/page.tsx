import { RolesScreen } from "@/features/employer/roles";
import { readListPage, readListSearch } from "@/shared/list-query";
import { parsePositiveInt } from "@/shared/routing";

export default async function RolesPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{
    roleId?: string;
    page?: string;
    q?: string;
    gpage?: string;
    gq?: string;
  }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  const selectedRoleId = query.roleId ? Number(query.roleId) : null;
  return (
    <RolesScreen
      employerId={parsePositiveInt(employerId)}
      grantPage={readListPage(query.gpage)}
      grantSearch={readListSearch(query.gq) ?? ""}
      page={readListPage(query.page)}
      search={readListSearch(query.q) ?? ""}
      selectedRoleId={
        selectedRoleId && Number.isInteger(selectedRoleId) && selectedRoleId > 0
          ? selectedRoleId
          : null
      }
    />
  );
}
