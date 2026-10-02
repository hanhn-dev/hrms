import { Suspense } from "react";
import { WorkflowsTabBar } from "@/features/employer/workflows/workflows-panel";
import {
  WorkflowPartialNote,
  WorkflowsTabSlot,
} from "@/features/employer/workflows/workflows-slots";
import type { WorkflowsTab } from "@/features/employer/workflows/workflows-source";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { PageHelp } from "@/shared/ui/shell-header-context";

const TAB_TITLE: Record<WorkflowsTab, string> = {
  workflows: "Workflows",
  pages: "Pages",
  groups: "Groups",
  requests: "Requests",
};

export async function WorkflowsScreen({
  employerId,
  tab,
  pageName,
  groupId,
  requestId,
}: {
  employerId: number;
  tab: WorkflowsTab;
  pageName: string | null;
  groupId: number | null;
  requestId: number | null;
}): Promise<React.JSX.Element> {
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  return (
    <>
      <PageHelp
        source="workflows"
        notes={[
          {
            id: "deactivate-workflow",
            type: "info",
            title: "Deactivate a workflow",
            description:
              "Enabled cannot be changed on this list. Open the workflow name, turn Enabled off, then Preview header save and confirm. That sets TWorkflowManagement.isenable for future routing only.",
          },
          {
            id: "change-request-apply",
            type: "info",
            title: "Change-request approve",
            description:
              "The Requests tab lists My Details change requests for this employer. Approve applies the field diffs and closes the queue. It does not call the product stored procedure, send approval email, or insert the next routing level.",
          },
        ]}
      />
      <Suspense fallback={null}>
        <WorkflowPartialNote employerId={employerId} />
      </Suspense>
      <WorkflowsTabBar employerId={employerId} tab={tab} writesEnabled={writesEnabled}>
        <Suspense fallback={<SectionFallback title={TAB_TITLE[tab]} />}>
          <WorkflowsTabSlot
            employerId={employerId}
            groupId={groupId}
            pageName={pageName}
            requestId={requestId}
            tab={tab}
            writesEnabled={writesEnabled}
          />
        </Suspense>
      </WorkflowsTabBar>
    </>
  );
}
