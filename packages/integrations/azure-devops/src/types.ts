export interface WorkItemAttachment {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly comment: string | null;
  readonly contentType: string | null;
  readonly size: number | null;
  readonly isImage: boolean;
}

export interface WorkItem {
  readonly id: number;
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly description: string;
  readonly acceptanceCriteria: string;
  readonly attachments: readonly WorkItemAttachment[];
  readonly tags: readonly string[];
  readonly assignedTo: string | null;
  readonly iterationPath: string;
  readonly areaPath: string;
  readonly parentId: number | null;
  readonly url: string;
}

export interface WorkItemSummary {
  readonly id: number;
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly url: string;
}

export interface WorkItemRequestEntry {
  readonly index: number;
  readonly rawValue: string;
  readonly normalizedValue: string;
  readonly parsedId: number | null;
}

export interface MultiWorkItemRequest {
  readonly rawIds: string;
  readonly entries: readonly WorkItemRequestEntry[];
  readonly validUniqueIds: readonly number[];
}

export type WorkItemBatchResultStatus = 'found' | 'invalid' | 'not_found' | 'inaccessible';

export interface WorkItemBatchResultEntry {
  readonly index: number;
  readonly input: string;
  readonly id: number | null;
  readonly status: WorkItemBatchResultStatus;
  readonly workItem: WorkItem | null;
  readonly message: string | null;
}

export interface WorkItemBatchResult {
  readonly requestedCount: number;
  readonly successCount: number;
  readonly issueCount: number;
  readonly results: readonly WorkItemBatchResultEntry[];
}

export interface AzureDevOpsConfig {
  readonly orgUrl: string;
  readonly project: string;
  readonly token: string;
}

export interface ListWorkItemsFilter {
  readonly project?: string;
  readonly type?: string | null;
  readonly state?: string | null;
  readonly iteration?: string | null;
  readonly top?: number;
}

export type PullRequestSortField = 'mergedDate' | 'pullRequestId';
export type PullRequestSortDirection = 'asc' | 'desc';
export type PullRequestLookupStage = 'needs_refinement' | 'complete';
export type PullRequestLookupIssueStatus = 'invalid' | 'not_found' | 'inaccessible';
export type PullRequestLinkSource = 'requested' | 'child';

export interface WorkItemPullRequestLookupRequest {
  readonly ids: string;
  readonly authors?: readonly string[];
  readonly targetBranches?: readonly string[];
  readonly statuses?: readonly string[];
  readonly sortBy?: PullRequestSortField;
  readonly sortDirection?: PullRequestSortDirection;
  readonly confirmUnfiltered?: boolean;
}

export interface PullRequestArtifactReference {
  readonly projectId: string;
  readonly repositoryId: string;
  readonly pullRequestId: number;
  readonly linkedWorkItemId: number;
  readonly requestedAncestorId: number;
  readonly linkSource: PullRequestLinkSource;
}

export interface PullRequestHashes {
  readonly mergeCommit: string | null;
  readonly sourceCommit: string | null;
  readonly targetCommit: string | null;
}

export interface PullRequestCandidate {
  readonly repositoryId: string;
  readonly pullRequestId: number;
  readonly title: string;
  readonly author: string | null;
  readonly status: string;
  readonly targetBranch: string;
  readonly mergedDate: string | null;
  readonly url: string;
  readonly hashes: PullRequestHashes;
  readonly relatedWorkItemIds: readonly number[];
  readonly requestedWorkItemIds: readonly number[];
  readonly childWorkItemIds: readonly number[];
}

export interface PullRequestFilterFacets {
  readonly authors: readonly string[];
  readonly targetBranches: readonly string[];
  readonly statuses: readonly string[];
  readonly sortFields: readonly PullRequestSortField[];
  readonly totalPullRequests: number;
}

export interface PullRequestLookupIssue {
  readonly workItemId: number | null;
  readonly input: string;
  readonly status: PullRequestLookupIssueStatus;
  readonly message: string;
}

export interface PullRequestCherryPickPlan {
  readonly commitHashes: readonly string[];
  readonly command: string | null;
  readonly skippedPullRequestIds: readonly number[];
}

export interface RefinementQuestion {
  readonly key: 'authors' | 'targetBranches' | 'statuses' | 'sortBy';
  readonly prompt: string;
  readonly options: readonly string[];
  readonly allowSkip: boolean;
  readonly multiSelect: boolean;
}

export interface PullRequestLookupResponse {
  readonly stage: PullRequestLookupStage;
  readonly requestedCount: number;
  readonly candidateTotal: number;
  readonly matchingTotal: number;
  readonly issues: readonly PullRequestLookupIssue[];
  readonly cherryPick: PullRequestCherryPickPlan | null;
  readonly facets: PullRequestFilterFacets | null;
  readonly questions: readonly RefinementQuestion[] | null;
  readonly results: readonly PullRequestCandidate[] | null;
}

export interface WorkItemContextMissingFields {
  readonly description: boolean;
  readonly acceptanceCriteria: boolean;
  readonly imageAttachments: boolean;
}

export interface ImageAttachmentContext {
  readonly attachmentId: string;
  readonly name: string;
  readonly resourceUri: string;
  readonly comment: string | null;
  readonly contentType: string | null;
  readonly size: number | null;
}

export interface WorkItemHierarchyContextEntry {
  readonly workItemId: number;
  readonly depth: number;
  readonly relationToRoot: 'root' | 'descendant';
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly parentId: number | null;
  readonly url: string;
  readonly description: string | null;
  readonly acceptanceCriteria: string | null;
  readonly missing: WorkItemContextMissingFields;
  readonly imageAttachments: readonly ImageAttachmentContext[];
}

export interface WorkItemHierarchyContextOmission {
  readonly kind: 'work_item' | 'attachment';
  readonly workItemId: number;
  readonly attachmentId: string | null;
  readonly status: 'not_found' | 'inaccessible' | 'metadata_unavailable';
  readonly message: string;
}

export interface WorkItemHierarchyContextResponse {
  readonly rootWorkItemId: number;
  readonly includedWorkItemCount: number;
  readonly omittedCount: number;
  readonly items: readonly WorkItemHierarchyContextEntry[];
  readonly omissions: readonly WorkItemHierarchyContextOmission[];
}
