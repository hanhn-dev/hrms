import { Suspense } from "react";
import Link from "next/link";
import { AzureLandingCards } from "@/features/azure/azure-landing-cards";
import { requireFeaturePage } from "@/shared/auth";
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
  await requireFeaturePage("azure");
  return (
    <div className="h-screen w-full overflow-y-auto">
      <div className="flex min-h-full w-full flex-col p-4 md:p-6">
        <PageHeader
          extra={
            <Link
              className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
              href="/employers"
            >
              Console
            </Link>
          }
          title="Azure DevOps"
        />
        <p className="-mt-2 mb-4 text-sm text-slate-600 dark:text-slate-300">
          Plan the sprint, review the code, then publish backlog items.
        </p>
        <AzureLandingCards />
      </div>
    </div>
  );
}
