import { DataFixScreen } from "@/features/employer/data-fix";
import { parsePositiveInt } from "@/shared/routing";

export default async function DataFixPage({
  params,
}: {
  params: Promise<{ employerId: string }>;
}): Promise<React.JSX.Element> {
  const { employerId } = await params;
  return <DataFixScreen employerId={parsePositiveInt(employerId)} />;
}
