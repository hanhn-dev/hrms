import { LogsScreen, parseLogsQuery, type LogsSearchParams } from "@/features/employer/logs";
import { parsePositiveInt } from "@/shared/routing";


export default async function LogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<LogsSearchParams>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <LogsScreen
      employerId={parsePositiveInt(employerId)}
      query={parseLogsQuery(query)}
    />
  );
}
