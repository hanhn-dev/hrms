import { Suspense } from "react";
import { FlowScreen } from "@/features/flows";

export default function FlowsPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <FlowScreen />
    </Suspense>
  );
}
