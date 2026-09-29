import { ExplorePanel } from "@/features/employer/explore/explore-panel";
import { PageHelp } from "@/shared/ui/shell-header-context";

export async function ExploreScreen({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  return (
    <>
      <PageHelp
        source="data-explorer"
        notes={[
          {
            id: "read-only",
            type: "info",
            title: "Read-only value search",
            description:
              "Pick tables and a value. Results are SELECT TOP only — no free-form SQL, writes, or stored procedures.",
          },
          {
            id: "employer-filter",
            type: "info",
            title: "Employer filter defaults on",
            description:
              "When a table has EmployerId / Employerid, search is scoped to the selected employer. Turn the filter off for a global scan. Tables without an employer column are always searched unscoped.",
          },
          {
            id: "match-mode",
            type: "info",
            title: "Exact vs Contains",
            description:
              "Exact matches string, number, and GUID columns when the value parses. Contains uses LIKE %value% on string columns only.",
          },
          {
            id: "table-typeahead",
            type: "info",
            title: "Table picker is typeahead",
            description:
              "Tables are not loaded upfront. Type at least 2 characters; results are debounced and limited to 50 matches.",
          },
          {
            id: "limits",
            type: "warning",
            title: "Hard caps",
            description:
              "At most 10 tables per search and 20 rows per table by default (max 50). Prefer the REPLICA environment for broad scans.",
          },
        ]}
      />
      <ExplorePanel employerId={employerId} />
    </>
  );
}
