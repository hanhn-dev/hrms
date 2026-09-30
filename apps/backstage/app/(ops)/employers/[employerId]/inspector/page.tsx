import { InspectorScreen } from "@/features/employer/inspector";
import { parsePositiveInt } from "@/shared/routing";

export default async function InspectorPage({
  params,
}: {
  params: Promise<{ employerId: string }>;
}): Promise<React.JSX.Element> {
  const { employerId } = await params;
  return <InspectorScreen employerId={parsePositiveInt(employerId)} />;
}
