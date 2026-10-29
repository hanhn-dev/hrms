import { Suspense } from "react";
import { MasterDataSlot } from "@/features/employer/master-data/master-data-slots";
import { PageHelp, SectionFallback } from "@/shared/ui";

export function MasterDataScreen({
  employerId,
  listKey,
  page,
  search,
}: {
  employerId: number;
  listKey: string | null;
  page: number;
  search: string;
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
              "The left search finds a master list by name. The table search asks the database for matching rows.",
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
        <MasterDataSlot employerId={employerId} listKey={listKey} page={page} search={search} />
      </Suspense>
    </>
  );
}
