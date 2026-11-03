import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import { TeamsSlot } from "@/features/azure/teams/teams-slots";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

const HELP = [
  {
    id: "local",
    type: "info" as const,
    title: "Local teams",
    description:
      "Create a named team, pick the Azure DevOps team that owns the sprints, and add people from the Azure DevOps project (Graph roster + identity search). On Team progress, select the local team to auto-fill those members. Teams are saved in Backstage only.",
  },
];

export function TeamsScreen(): React.JSX.Element {
  return (
    <div className="h-screen overflow-y-auto">
      <div className="w-full min-w-0 p-4 md:p-6">
        <PageHeader extra={<AzureNav active="teams" />} notes={HELP} title="Teams" />
        <Suspense fallback={<SectionFallback title="Teams" />}>
          <TeamsSlot />
        </Suspense>
      </div>
    </div>
  );
}
