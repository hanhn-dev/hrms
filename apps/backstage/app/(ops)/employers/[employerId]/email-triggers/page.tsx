import {
  EmailTriggersScreen,
  parseEmailTriggersQuery,
  type EmailTriggersSearchParams,
} from "@/features/employer/email-triggers";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmailTriggersPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<EmailTriggersSearchParams>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <EmailTriggersScreen
      employerId={parsePositiveInt(employerId)}
      query={parseEmailTriggersQuery(query)}
    />
  );
}
