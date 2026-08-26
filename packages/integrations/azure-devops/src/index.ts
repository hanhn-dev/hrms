export type {
	AzureDevOpsConfig,
	ImageAttachmentContext,
	PullRequestArtifactReference,
	PullRequestCandidate,
	PullRequestChangePage,
	PullRequestChangeType,
	PullRequestChangedFile,
	PullRequestCommitSummary,
	PullRequestDetail,
	PullRequestDetailRequest,
	PullRequestFilterFacets,
	PullRequestHashes,
	PullRequestLineDiffBlock,
	PullRequestLineDiffChangeType,
	PullRequestLookupIssue,
	PullRequestLookupIssueStatus,
	PullRequestLookupResponse,
	PullRequestLookupStage,
	PullRequestReviewer,
	PullRequestReviewerVote,
	PullRequestSortDirection,
	PullRequestSortField,
	RefinementQuestion,
	MultiWorkItemRequest,
	ListWorkItemsFilter,
	SearchWorkItemsFilter,
	WorkItemComment,
	WorkItemCommentsResponse,
	WorkItemContextMissingFields,
	WorkItemHierarchyContextEntry,
	WorkItemHierarchyContextOmission,
	WorkItemHierarchyContextResponse,
	WorkItemPullRequestLookupRequest,
	WorkItemBatchResult,
	WorkItemBatchResultEntry,
	WorkItemBatchResultStatus,
	AcceptanceCriteriaItem,
	WorkItem,
	WorkItemAttachment,
	WorkItemCoverage,
	WorkItemInlineImage,
	WorkItemLink,
	WorkItemLinkKind,
	WorkItemFieldRevision,
	WorkItemFieldRevisionsResponse,
	WorkItemSpecAttachmentInventory,
	WorkItemSpecContext,
	WorkItemSpecContextChild,
	WorkItemRequestEntry,
	WorkItemSummary,
	PullRequestThread,
	PullRequestThreadComment,
	PullRequestThreadsRequest,
	PullRequestThreadsResponse,
} from './types.js';
export {
	AzureDevOpsClient,
	classifyPullRequestLookupError,
	classifyWorkItemLookupError,
	getAzureDevOpsErrorMessage,
} from './client.js';
export { loadConfig } from './config.js';
export {
	acceptanceCriteriaLooksBuriedInDescription,
	buildWorkItemCoverage,
	htmlFieldHasContent,
	isAcceptanceCriteriaEmpty,
	isDescriptionThin,
	stripBoilerplate,
} from './coverage.js';
export { extractInlineImages, htmlToMarkdown } from './html-to-text.js';
export {
	isObservableAcceptanceCriterion,
	parseAcceptanceCriteria,
} from './parse-acceptance-criteria.js';
export {
	getOrganizationIdentity,
	getPullRequestDetail,
	parsePullRequestReference,
	resolvePullRequest,
} from './pull-request-detail.js';
export type { ParsedPullRequestReference } from './pull-request-detail.js';
export { getWorkItemPullRequests } from './pull-requests.js';
export { getWorkItem, getWorkItemHierarchyContext, getWorkItemsByIds, listWorkItems, mapWorkItemLinks, parseWorkItemIdsInput, queryWorkItems, searchWorkItems, withWorkItemLinkTitles } from './work-items.js';
export { getWorkItemComments } from './work-item-comments.js';
export { getWorkItemSpecContext } from './work-item-spec-context.js';
export { getWorkItemFieldRevisions } from './work-item-revisions.js';
export { listPullRequestThreads } from './pull-request-threads.js';
