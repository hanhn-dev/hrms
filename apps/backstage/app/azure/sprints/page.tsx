import { SprintsScreen } from "@/features/azure/sprints";

export default async function AzureSprintsPage({
  searchParams,
}: {
  searchParams: Promise<{ iteration?: string }>;
}): Promise<React.JSX.Element> {
  const { iteration } = await searchParams;
  return <SprintsScreen iterationPath={iteration} />;
}
