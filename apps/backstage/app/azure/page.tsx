import { Suspense } from "react";
import { AzureLandingCards } from "@/features/azure/azure-landing-cards";
import { AzureNav } from "@/features/azure/azure-nav";
import { requireRootAdminPage } from "@/shared/auth";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

export default function AzurePage(): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Azure DevOps" />}>
      <AzurePageBody />
    </Suspense>
  );
}

async function AzurePageBody(): Promise<React.JSX.Element> {
  await requireRootAdminPage();
  return (
    <div className="h-screen overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        <PageHeader extra={<AzureNav />} title="Azure DevOps" />
        <AzureLandingCards />
      </div>
    </div>
  );
}
