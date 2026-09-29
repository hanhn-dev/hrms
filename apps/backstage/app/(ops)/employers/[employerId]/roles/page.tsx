import { RolesScreen } from "@/features/employer/roles";
import { parsePositiveInt } from "@/shared/routing";

export default async function RolesPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ roleId?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  const selectedRoleId = query.roleId ? Number(query.roleId) : null;
  return (
    <RolesScreen
      employerId={parsePositiveInt(employerId)}
      selectedRoleId={
        selectedRoleId && Number.isInteger(selectedRoleId) && selectedRoleId > 0
          ? selectedRoleId
          : null
      }
    />
  );
}
