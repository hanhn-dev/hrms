import { MenuScreen } from "@/features/employer/menu";
import { parsePositiveInt } from "@/shared/routing";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ employerId: string }>;
}): Promise<React.JSX.Element> {
  const { employerId } = await params;
  return <MenuScreen employerId={parseMenuRouteId(employerId)} />;
}

function parseMenuRouteId(value: string): number {
  if (value === "0") {
    return 0;
  }
  return parsePositiveInt(value);
}
