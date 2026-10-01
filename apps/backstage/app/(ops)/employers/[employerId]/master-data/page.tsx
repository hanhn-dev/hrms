import { MasterDataScreen } from "@/features/employer/master-data";
import { parsePositiveInt } from "@/shared/routing";

export default async function MasterDataPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ list?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  const listKey = query.list?.trim() ? query.list.trim() : null;
  return (
    <MasterDataScreen
      employerId={parsePositiveInt(employerId)}
      listKey={listKey}
    />
  );
}
