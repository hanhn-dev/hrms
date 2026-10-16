import {
  isPullRequestSearchCriteriaEmpty,
  type PullRequestSearchCriteria,
} from "@hrms/azure-devops/criteria";

export function canSearchPullRequests(criteria: PullRequestSearchCriteria): boolean {
  return !isPullRequestSearchCriteriaEmpty(criteria);
}
