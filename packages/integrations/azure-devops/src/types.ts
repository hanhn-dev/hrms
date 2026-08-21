export interface WorkItemAttachment {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly comment: string | null;
  readonly contentType: string | null;
  readonly size: number | null;
  readonly isImage: boolean;
  readonly resourceUri: string | null;
}

export interface WorkItem {
  readonly id: number;
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly description: string;
  readonly reproSteps: string;
  readonly acceptanceCriteria: string;
  readonly attachments: readonly WorkItemAttachment[];
  readonly tags: readonly string[];
  readonly assignedTo: string | null;
  readonly iterationPath: string;
  readonly areaPath: string;
  readonly parentId: number | null;
  readonly priority: number | null;
  readonly severity: string | null;
  readonly createdDate: string | null;
  readonly changedDate: string | null;
  readonly createdBy: string | null;
  readonly childIds: readonly number[];
  readonly relatedWorkItemIds: readonly number[];
  readonly hints: readonly string[];
  readonly url: string;
}

export interface WorkItemSummary {
  readonly id: number;
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly assignedTo: string | null;
  readonly tags: readonly string[];
  readonly changedDate: string | null;
  readonly iterationPath: string;
  readonly parentId: number | null;
  readonly url: string;
}

export interface WorkItemComment {
  readonly id: number;
  readonly author: string | null;
  readonly createdDate: string | null;
  readonly text: string;
}

export interface WorkItemCommentsResponse {
  readonly workItemId: number;
  readonly totalCount: number;
  readonly hasMore: boolean;
  readonly comments: readonly WorkItemComment[];
}

export interface SearchWorkItemsFilter {
  readonly project?: string;
  readonly titleContains?: string;
  readonly assignedTo?: string;
  readonly type?: string;
  readonly state?: string;
  readonly iteration?: string;
  readonly changedSince?: string;
  readonly top?: number;
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

export type PullRequestChangeType = 'add' | 'edit' | 'delete' | 'rename' | 'other';
export type PullRequestLineDiffChangeType = 'none' | 'add' | 'delete' | 'edit';
export type PullRequestReviewerVote =
  | 'approved'
  | 'approved_with_suggestions'
  | 'no_vote'
  | 'waiting_for_author'
  | 'rejected'
  | 'unknown';

export interface PullRequestDetailRequest {
  readonly pullRequest: string | number;
  readonly top?: number;
  readonly skip?: number;
  readonly includeContents?: boolean;
}

export interface PullRequestReviewer {
  readonly displayName: string | null;
  readonly vote: PullRequestReviewerVote;
  readonly isRequired: boolean;
}

export interface PullRequestCommitSummary {
  readonly commitId: string;
  readonly comment: string | null;
  readonly author: string | null;
}

export interface PullRequestLineDiffBlock {
  readonly changeType: PullRequestLineDiffChangeType;
  readonly originalLineNumberStart: number | null;
  readonly originalLinesCount: number | null;
  readonly modifiedLineNumberStart: number | null;
  readonly modifiedLinesCount: number | null;
}

export interface PullRequestChangedFile {
  readonly path: string;
  readonly originalPath: string | null;
  readonly changeType: PullRequestChangeType;
  readonly isBinary: boolean;
  readonly omission: string | null;
  readonly truncation: {
    readonly base: boolean;
    readonly current: boolean;
    readonly diff: boolean;
  } | null;
  readonly unifiedDiff: string | null;
  readonly baseContent: string | null;
  readonly currentContent: string | null;
  readonly lineDiffBlocks: readonly PullRequestLineDiffBlock[];
}

export interface PullRequestChangePage {
  readonly totalCount: number;
  readonly returnedCount: number;
  readonly skip: number;
  readonly top: number;
  readonly hasMore: boolean;
  readonly files: readonly PullRequestChangedFile[];
}

export interface PullRequestDetail {
  readonly pullRequestId: number;
  readonly title: string;
  readonly description: string | null;
  readonly status: string;
  readonly author: string | null;
  readonly createdDate: string | null;
  readonly closedDate: string | null;
  readonly sourceBranch: string;
  readonly targetBranch: string;
  readonly url: string;
  readonly projectId: string;
  readonly repositoryId: string;
  readonly repositoryName: string | null;
  readonly hashes: PullRequestHashes;
  readonly reviewers: readonly PullRequestReviewer[];
  readonly commits: readonly PullRequestCommitSummary[];
  readonly workItemIds: readonly number[];
  readonly iterationId: number;
  readonly changes: PullRequestChangePage;
}

export interface WorkItemContextMissingFields {
  readonly description: boolean;
  readonly acceptanceCriteria: boolean;
  readonly reproSteps: boolean;
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
  readonly reproSteps: string | null;
  readonly acceptanceCriteria: string | null;
  readonly missing: WorkItemContextMissingFields;
  readonly imageAttachments: readonly ImageAttachmentContext[];
}

export interface PullRequestThreadComment {
  readonly id: number;
  readonly author: string | null;
  readonly content: string;
  readonly publishedDate: string | null;
}

export interface PullRequestThread {
  readonly threadId: number;
  readonly status: string;
  readonly filePath: string | null;
  readonly line: number | null;
  readonly comments: readonly PullRequestThreadComment[];
}

export interface PullRequestThreadsRequest {
  readonly pullRequest: string | number;
  readonly status?: string;
}

export interface PullRequestThreadsResponse {
  readonly pullRequestId: number;
  readonly threads: readonly PullRequestThread[];
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
