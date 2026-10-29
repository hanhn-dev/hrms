import { LogsScreen, parseLogsQuery, type LogsSearchParams } from "@/features/employer/logs";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { parsePositiveInt } from "@/shared/routing";


export default async function LogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<LogsSearchParams>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query, environment] = await Promise.all([
    params,
    searchParams,
    getSelectedEnvironment(),
  ]);
  return (
    <LogsScreen
      employerId={parsePositiveInt(employerId)}
      query={parseLogsQuery(query)}
      writesEnabled={areWritesEnabled(environment)}
    />
  );
}
