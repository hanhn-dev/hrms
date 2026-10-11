import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import {
  IterationWorkItemsSlot,
  IterationsSlot,
} from "@/features/azure/sprints/sprints-slots";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

export async function SprintsScreen({
  iterationPath,
}: {
  iterationPath?: string;
}): Promise<React.JSX.Element> {
  return (
    <div className="h-screen overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6">
        <PageHeader extra={<AzureNav active="sprints" />} title="Sprints" />
        <Suspense fallback={<SectionFallback title="Sprints" />}>
          <IterationsSlot selectedIterationPath={iterationPath} />
        </Suspense>
        {iterationPath ? (
          <Suspense fallback={<SectionFallback title="Work items" />}>
            <IterationWorkItemsSlot iterationPath={iterationPath} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
