import { EmployerPickerScreen } from "@/features/employer/picker";
import { requireFeaturePage } from "@/shared/auth";
import { readListPage, readListSearch } from "@/shared/list-query";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}): Promise<React.JSX.Element> {
  const user = await requireFeaturePage("employers");
  const query = await searchParams;
  return (
    <EmployerPickerScreen
      page={readListPage(query.page)}
      search={readListSearch(query.q) ?? ""}
      userName={user.name ?? "Signed in"}
    />
  );
}
