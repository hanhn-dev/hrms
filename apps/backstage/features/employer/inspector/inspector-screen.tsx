import { InspectorTabs } from "@/features/employer/inspector/inspector-tabs";
import { listInspectorEmployers } from "@/features/employer/inspector/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import type { PageHelpNote } from "@/shared/ui/page-help";
import { PageHelp } from "@/shared/ui/shell-header-context";

const INSPECTOR_NOTES: PageHelpNote[] = [
  {
    id: "value",
    type: "info",
    title: "Find a value",
    description:
      "Exact match checks string, numeric, and guid columns. Search a table name and press Enter to limit the scan; leave it empty to search every remaining table. Contains needs at least one table. Ignore tags are name fragments; tables whose names contain one are skipped. The default tag is history.",
  },
  {
    id: "employer",
    type: "info",
    title: "Employer filter",
    description:
      "The page employer is selected by default. Clear it to search every employer. Tables without an EmployerId column are still searched and labeled.",
  },
  {
    id: "script",
    type: "info",
    title: "Object script",
    description:
      "Pick a stored procedure, function, or view to read its script. Keywords are colored. Object chips use the studio colors: blue tables, orange procedures, cyan functions, purple views. Click a chip to open it in another tab. The list beside the script groups tables, views, procedures, and functions used in the script. View script opens that object in another tab. Execute asks for parameters and shows the result in the same window. Procedure execution follows the writes gate. Ctrl+Tab and Ctrl+Shift+Tab move between tabs. Ctrl+W closes the current tab. Encrypted or missing definitions show the reason.",
  },
];

export async function InspectorScreen({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const [employers, writesEnabled] = await Promise.all([
    listInspectorEmployers(),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHelp source="inspector" notes={INSPECTOR_NOTES} />
      <InspectorTabs
        employers={employers}
        routeEmployerId={employerId}
        writesEnabled={writesEnabled}
      />
    </div>
  );
}
