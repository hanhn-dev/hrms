import { Suspense } from "react";
import { GitScreen } from "@/features/azure/git";
import { requireFeaturePage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

export default function AzureGitPage(): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Git" />}>
      <AzureGitPageBody />
    </Suspense>
  );
}

async function AzureGitPageBody(): Promise<React.JSX.Element> {
  await requireFeaturePage("azure");
  return <GitScreen />;
}
