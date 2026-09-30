import {
  NotificationsScreen,
  parseNotificationsQuery,
  type NotificationsSearchParams,
} from "@/features/employer/notifications";
import { parsePositiveInt } from "@/shared/routing";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<NotificationsSearchParams>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <NotificationsScreen
      employerId={parsePositiveInt(employerId)}
      query={parseNotificationsQuery(query)}
    />
  );
}
