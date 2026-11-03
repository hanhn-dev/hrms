import { Suspense } from "react";
import { TeamsScreen } from "@/features/azure/teams";
import { requireFeaturePage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

export default function AzureTeamsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Teams" />}>
      <AzureTeamsPageBody />
    </Suspense>
  );
}

async function AzureTeamsPageBody(): Promise<React.JSX.Element> {
  await requireFeaturePage("azure");
  return <TeamsScreen />;
}
