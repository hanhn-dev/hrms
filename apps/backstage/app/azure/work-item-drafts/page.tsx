import { Suspense } from "react";
import { WorkItemDraftsScreen } from "@/features/azure/work-item-drafts";
import { requireRootAdminPage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

export default function AzureWorkItemDraftsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Work item drafts" />}>
      <AzureWorkItemDraftsPageBody />
    </Suspense>
  );
}

async function AzureWorkItemDraftsPageBody(): Promise<React.JSX.Element> {
  await requireRootAdminPage();
  return <WorkItemDraftsScreen />;
}
