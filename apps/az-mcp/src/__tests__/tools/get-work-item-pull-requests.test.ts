import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
	getWorkItemPullRequests: vi.fn(),
	AzureDevOpsClient: vi.fn(),
}));

import { getWorkItemPullRequests } from '@hrms/azure-devops';
import type { AzureDevOpsClient, PullRequestLookupResponse } from '@hrms/azure-devops';
import { createGetWorkItemPullRequestsHandler } from '../../tools/get-work-item-pull-requests.js';

const mockClient = {} as AzureDevOpsClient;

const mockLookupResponse: PullRequestLookupResponse = {
	stage: 'complete',
	requestedCount: 1,
	candidateTotal: 2,
	matchingTotal: 1,
	issues: [],
	cherryPick: {
		commitHashes: ['merge-501'],
		command: 'git cherry-pick -m 1 merge-501',
		skippedPullRequestIds: [],
	},
	facets: null,
	questions: null,
	results: [
		{
			repositoryId: 'repo-a',
			pullRequestId: 501,
			title: 'PR 501',
			author: 'Alice',
			status: 'completed',
			targetBranch: 'refs/heads/main',
			mergedDate: '2026-05-16T11:20:00Z',
			url: 'https://dev.azure.com/example/project/_git/repo-a/pullrequest/501',
			hashes: {
				mergeCommit: 'merge-501',
				sourceCommit: 'source-501',
				targetCommit: 'target-501',
			},
			relatedWorkItemIds: [101, 202],
			requestedWorkItemIds: [101],
			childWorkItemIds: [202],
		},
	],
};

const mockNeedsRefinementResponse: PullRequestLookupResponse = {
	...mockLookupResponse,
	stage: 'needs_refinement',
	matchingTotal: 2,
	cherryPick: null,
	facets: {
		authors: ['Alice', 'Bob'],
		targetBranches: ['refs/heads/main', 'refs/heads/release'],
		statuses: ['active', 'completed'],
		sortFields: ['mergedDate', 'pullRequestId'],
		totalPullRequests: 2,
	},
	questions: [
		{
			key: 'authors',
			prompt: 'Filter by which authors?',
			options: ['Alice', 'Bob'],
			allowSkip: true,
			multiSelect: true,
		},
	],
	results: null,
};

describe('get_work_item_pull_requests tool handler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes lookup arguments through and serializes the response', async () => {
		vi.mocked(getWorkItemPullRequests).mockResolvedValue(mockLookupResponse);
		const handler = createGetWorkItemPullRequestsHandler(mockClient);

		const result = await handler({
			ids: '101,202',
			authors: ['Alice'],
			targetBranches: ['refs/heads/main'],
			statuses: ['completed'],
			sortBy: 'mergedDate',
			sortDirection: 'desc',
			confirmUnfiltered: true,
		});

		expect(getWorkItemPullRequests).toHaveBeenCalledWith(mockClient, {
			ids: '101,202',
			authors: ['Alice'],
			targetBranches: ['refs/heads/main'],
			statuses: ['completed'],
			sortBy: 'mergedDate',
			sortDirection: 'desc',
			confirmUnfiltered: true,
		});
		expect(result.isError).toBeFalsy();
		expect(JSON.parse(result.content[0]!.text)).toMatchObject({
			candidateTotal: 2,
			matchingTotal: 1,
			cherryPick: {
				command: 'git cherry-pick -m 1 merge-501',
			},
		});
	});

	it('serializes needs_refinement responses without converting them into MCP errors', async () => {
		vi.mocked(getWorkItemPullRequests).mockResolvedValue(mockNeedsRefinementResponse);
		const handler = createGetWorkItemPullRequestsHandler(mockClient);

		const result = await handler({ ids: '101,202' });

		expect(result.isError).toBeFalsy();
		expect(JSON.parse(result.content[0]!.text)).toMatchObject({
			stage: 'needs_refinement',
			matchingTotal: 2,
			cherryPick: null,
			results: null,
		});
	});

	it('elicits refinement input and reruns the lookup before returning the final result', async () => {
		vi.mocked(getWorkItemPullRequests)
			.mockResolvedValueOnce(mockNeedsRefinementResponse)
			.mockResolvedValueOnce(mockLookupResponse);
		const elicitInput = vi.fn().mockResolvedValue({
			action: 'accept',
			content: {
				authors: ['Alice'],
				targetBranches: ['refs/heads/main'],
				statuses: ['completed'],
				sortBy: 'mergedDate',
				sortDirection: 'desc',
			},
		});
		const handler = createGetWorkItemPullRequestsHandler(mockClient, { elicitInput });

		const result = await handler({ ids: '101,202' });

		expect(elicitInput).toHaveBeenCalledTimes(1);
		expect(elicitInput).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'form',
				requestedSchema: expect.objectContaining({
					type: 'object',
					properties: expect.objectContaining({
						authors: expect.any(Object),
						targetBranches: expect.any(Object),
						statuses: expect.any(Object),
						sortBy: expect.any(Object),
						sortDirection: expect.any(Object),
					}),
				}),
			}),
		);
		expect(getWorkItemPullRequests).toHaveBeenNthCalledWith(1, mockClient, { ids: '101,202' });
		expect(getWorkItemPullRequests).toHaveBeenNthCalledWith(2, mockClient, {
			ids: '101,202',
			authors: ['Alice'],
			targetBranches: ['refs/heads/main'],
			statuses: ['completed'],
			sortBy: 'mergedDate',
			sortDirection: 'desc',
			confirmUnfiltered: true,
		});
		expect(JSON.parse(result.content[0]!.text)).toMatchObject({
			stage: 'complete',
			candidateTotal: 2,
			matchingTotal: 1,
			cherryPick: {
				command: 'git cherry-pick -m 1 merge-501',
			},
		});
	});

	it('falls back to the staged response when elicitation is unavailable', async () => {
		vi.mocked(getWorkItemPullRequests).mockResolvedValue(mockNeedsRefinementResponse);
		const elicitInput = vi.fn().mockRejectedValue(new Error('Client does not support form elicitation.'));
		const handler = createGetWorkItemPullRequestsHandler(mockClient, { elicitInput });

		const result = await handler({ ids: '101,202' });

		expect(elicitInput).toHaveBeenCalledTimes(1);
		expect(getWorkItemPullRequests).toHaveBeenCalledTimes(1);
		expect(JSON.parse(result.content[0]!.text)).toMatchObject({
			stage: 'needs_refinement',
			matchingTotal: 2,
			cherryPick: null,
			results: null,
		});
	});

	it('preserves already-supplied filters when elicitation returns only partial content', async () => {
		vi.mocked(getWorkItemPullRequests)
			.mockResolvedValueOnce(mockNeedsRefinementResponse)
			.mockResolvedValueOnce(mockLookupResponse);
		const elicitInput = vi.fn().mockResolvedValue({
			action: 'accept',
			content: {
				sortBy: 'mergedDate',
				sortDirection: 'desc',
			},
		});
		const handler = createGetWorkItemPullRequestsHandler(mockClient, { elicitInput });

		await handler({
			ids: '101,202',
			authors: ['Hanh Nguyen', 'Nakeeb'],
			targetBranches: ['Dev'],
			statuses: ['Completed'],
		});

		expect(getWorkItemPullRequests).toHaveBeenNthCalledWith(2, mockClient, {
			ids: '101,202',
			authors: ['Hanh Nguyen', 'Nakeeb'],
			targetBranches: ['Dev'],
			statuses: ['Completed'],
			sortBy: 'mergedDate',
			sortDirection: 'desc',
			confirmUnfiltered: true,
		});
	});
});