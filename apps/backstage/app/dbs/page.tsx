import { Suspense } from "react";
import { DbsScreen } from "@/features/dbs";
import { SectionFallback } from "@/shared/ui/section-fallback";

export default function DbsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Db Studio" />}>
      <DbsScreen />
    </Suspense>
  );
}
