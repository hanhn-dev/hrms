import { Suspense } from "react";
import { MasterDataSlot } from "@/features/employer/master-data/master-data-slots";
import { PageHelp, SectionFallback } from "@/shared/ui";

export function MasterDataScreen({
  employerId,
  listKey,
}: {
  employerId: number;
  listKey: string | null;
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="master-data"
        notes={[
          {
            id: "search",
            type: "info",
            title: "Search the catalog and the open list",
            description:
              "The left search finds a master list by name. The right search filters the loaded rows.",
          },
          {
            id: "hmac-confirm",
            type: "info",
            title: "Add, edit, and delete use preview then confirm",
            description:
              "Each save opens a before/after preview. Commit updates only the allowlisted columns. Delete removes that row and fails when the value is still in use.",
          },
        ]}
      />
      <Suspense fallback={<SectionFallback title="Master data" />}>
        <MasterDataSlot employerId={employerId} listKey={listKey} />
      </Suspense>
    </>
  );
}
