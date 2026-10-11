import { AzureLandingCards } from "@/features/azure/azure-landing-cards";
import { AzureNav } from "@/features/azure/azure-nav";
import { PageHeader } from "@/shared/ui/page-header";

export default async function AzurePage(): Promise<React.JSX.Element> {
  return (
    <div className="h-screen overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        <PageHeader extra={<AzureNav />} title="Azure DevOps" />
        <AzureLandingCards />
      </div>
    </div>
  );
}
