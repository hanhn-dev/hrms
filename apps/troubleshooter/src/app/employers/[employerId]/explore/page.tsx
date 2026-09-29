import { ExploreScreen } from "@/features/employer/explore";
import { parsePositiveInt } from "@/shared/routing";

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ employerId: string }>;
}): Promise<React.JSX.Element> {
  const { employerId } = await params;
  return <ExploreScreen employerId={parsePositiveInt(employerId)} />;
}
