import { EmployerSettingsScreen } from "@/features/employer/settings";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployerPage({
  params,
}: {
  params: Promise<{ employerId: string }>;
}): Promise<React.JSX.Element> {
  const { employerId } = await params;
  return <EmployerSettingsScreen employerId={parsePositiveInt(employerId)} />;
}
