import { PullRequestsPanel } from "@/features/azure/pull-requests/pull-requests-panel";
import { loadPullRequestSearchOptions } from "@/features/azure/pull-requests/queries";

export async function PullRequestsSearchSlot(): Promise<React.JSX.Element> {
  const options = await loadPullRequestSearchOptions();
  return <PullRequestsPanel options={options} />;
}
