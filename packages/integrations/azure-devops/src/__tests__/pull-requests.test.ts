import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PullRequestStatus } from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import { getWorkItemPullRequests } from '../pull-requests.js';

const mockConfig: AzureDevOpsConfig = {
	orgUrl: 'https://dev.azure.com/example',
	project: 'Sample Project',
	token: 'token',
};

const topLevelWorkItem = {
	id: 101,
	fields: {
		'System.Title': 'Parent story',
		'System.WorkItemType': 'User Story',
		'System.State': 'Active',
	},
	relations: [
		{
			rel: 'System.LinkTypes.Hierarchy-Forward',
			url: 'https://dev.azure.com/example/_apis/wit/workItems/202',
		},
		{
			rel: 'ArtifactLink',
			url: 'vstfs:///Git/PullRequestId/project-guid/repo-a/501',
		},
	],
};

const childTask = {
	id: 202,
	fields: {
		'System.Title': 'Child task',
		'System.WorkItemType': 'Task',
		'System.State': 'Done',
	},
	relations: [
		{
			rel: 'ArtifactLink',
			url: 'vstfs:///Git/PullRequestId/project-guid/repo-a/501',
		},
		{
			rel: 'ArtifactLink',
			url: 'vstfs:///Git/PullRequestId/project-guid/repo-b/502',
		},
	],
};

const mockWitApi = {
	getWorkItemsBatch: vi.fn(),
	getWorkItem: vi.fn(),
};

const mockGitApi = {
	getPullRequest: vi.fn(),
};

const mockClient = {
	config: mockConfig,
	getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
	getGitApi: vi.fn().mockResolvedValue(mockGitApi),
} as unknown as AzureDevOpsClient;

describe('getWorkItemPullRequests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function mockDiscoveryGraph(): void {
		mockWitApi.getWorkItemsBatch
			.mockResolvedValueOnce([topLevelWorkItem])
			.mockResolvedValueOnce([childTask]);
		mockWitApi.getWorkItem.mockResolvedValueOnce(null);
	}

	it('deduplicates PRs across requested and child work items while preserving traceability', async () => {
		mockDiscoveryGraph();
		mockWitApi.getWorkItem.mockResolvedValueOnce(null);
		mockGitApi.getPullRequest.mockImplementation(
			async (repositoryId: string, pullRequestId: number, projectId?: string) => ({
				repository: { id: repositoryId },
				pullRequestId,
				artifactId: `vstfs:///Git/PullRequestId/${projectId}/${repositoryId}/${pullRequestId}`,
				title: `PR ${pullRequestId}`,
				createdBy: { displayName: pullRequestId === 501 ? 'Alice' : 'Bob' },
				status: pullRequestId === 501 ? PullRequestStatus.Completed : PullRequestStatus.Active,
				targetRefName: pullRequestId === 501 ? 'refs/heads/main' : 'refs/heads/release/2026.05',
				url: `https://dev.azure.com/example/project/_git/${repositoryId}/pullrequest/${pullRequestId}`,
				lastMergeCommit: { commitId: pullRequestId === 501 ? 'merge-501' : undefined },
				lastMergeSourceCommit: { commitId: `source-${pullRequestId}` },
				lastMergeTargetCommit: { commitId: `target-${pullRequestId}` },
			}),
		);

		const result = await getWorkItemPullRequests(mockClient, {
			ids: '101,999,abc',
			confirmUnfiltered: true,
		});

		expect(result.stage).toBe('complete');
		expect(result.candidateTotal).toBe(2);
		expect(result.matchingTotal).toBe(2);
		expect(result.issues).toEqual([
			{
				workItemId: 999,
				input: '999',
				status: 'not_found',
				message: 'Work item 999 not found',
			},
			{
				workItemId: null,
				input: 'abc',
				status: 'invalid',
				message: 'Invalid work item ID: abc',
			},
		]);
		expect(result.results).toHaveLength(2);
		expect(result.cherryPick).toEqual({
			commitHashes: ['merge-501'],
			command: 'git cherry-pick -m 1 merge-501',
			skippedPullRequestIds: [502],
		});
		expect(result.results?.[0]).toMatchObject({
			repositoryId: 'repo-a',
			pullRequestId: 501,
			author: 'Alice',
			status: 'completed',
			relatedWorkItemIds: [101, 202],
			requestedWorkItemIds: [101],
			childWorkItemIds: [202],
			hashes: {
				mergeCommit: 'merge-501',
				sourceCommit: 'source-501',
				targetCommit: 'target-501',
			},
		});
		expect(mockGitApi.getPullRequest).toHaveBeenCalledTimes(2);
		expect(mockGitApi.getPullRequest).toHaveBeenCalledWith(
			'repo-a',
			501,
			'project-guid',
			undefined,
			undefined,
			undefined,
			false,
			false,
		);
	});

	it('returns refinement questions and filter facets when no refinement inputs are supplied', async () => {
		mockDiscoveryGraph();
		mockGitApi.getPullRequest.mockImplementation(
			async (repositoryId: string, pullRequestId: number, projectId?: string) => ({
				repository: { id: repositoryId },
				pullRequestId,
				artifactId: `vstfs:///Git/PullRequestId/${projectId}/${repositoryId}/${pullRequestId}`,
				title: `PR ${pullRequestId}`,
				createdBy: { displayName: pullRequestId === 501 ? 'Alice' : 'Bob' },
				status: pullRequestId === 501 ? PullRequestStatus.Completed : PullRequestStatus.Active,
				targetRefName: pullRequestId === 501 ? 'refs/heads/main' : 'refs/heads/release/2026.05',
				url: `https://dev.azure.com/example/project/_git/${repositoryId}/pullrequest/${pullRequestId}`,
				closedDate: pullRequestId === 501 ? '2026-05-16T11:20:00Z' : undefined,
				lastMergeCommit: { commitId: pullRequestId === 501 ? 'merge-501' : undefined },
				lastMergeSourceCommit: { commitId: `source-${pullRequestId}` },
				lastMergeTargetCommit: { commitId: `target-${pullRequestId}` },
			}),
		);

		const result = await getWorkItemPullRequests(mockClient, {
			ids: '101,999,abc',
		});

		expect(result.stage).toBe('needs_refinement');
		expect(result.candidateTotal).toBe(2);
		expect(result.matchingTotal).toBe(2);
		expect(result.results).toBeNull();
		expect(result.cherryPick).toBeNull();
		expect(result.facets).toEqual({
			authors: ['Alice', 'Bob'],
			targetBranches: ['refs/heads/main', 'refs/heads/release/2026.05'],
			statuses: ['active', 'completed'],
			sortFields: ['mergedDate', 'pullRequestId'],
			totalPullRequests: 2,
		});
		expect(result.questions?.map((question) => question.key)).toEqual([
			'authors',
			'targetBranches',
			'statuses',
			'sortBy',
		]);
	});

	it('applies author, target branch, and status filters before returning the final list', async () => {
		mockWitApi.getWorkItemsBatch
			.mockResolvedValueOnce([
				{
					...topLevelWorkItem,
					relations: [
						...(topLevelWorkItem.relations ?? []),
						{
							rel: 'System.LinkTypes.Hierarchy-Forward',
							url: 'https://dev.azure.com/example/_apis/wit/workItems/203',
						},
					],
				},
			])
			.mockResolvedValueOnce([
				childTask,
				{
					id: 203,
					fields: {
						'System.Title': 'Child issue',
						'System.WorkItemType': 'Issue',
						'System.State': 'Done',
					},
					relations: [
						{
							rel: 'ArtifactLink',
							url: 'vstfs:///Git/PullRequestId/project-guid/repo-c/503',
						},
					],
				},
			]);
		mockGitApi.getPullRequest.mockImplementation(
			async (repositoryId: string, pullRequestId: number, projectId?: string) => ({
				repository: { id: repositoryId },
				pullRequestId,
				artifactId: `vstfs:///Git/PullRequestId/${projectId}/${repositoryId}/${pullRequestId}`,
				title: `PR ${pullRequestId}`,
				createdBy: { displayName: pullRequestId === 503 ? 'Alice' : 'Bob' },
				status: PullRequestStatus.Completed,
				targetRefName: pullRequestId === 503 ? 'refs/heads/main' : 'refs/heads/release/2026.05',
				url: `https://dev.azure.com/example/project/_git/${repositoryId}/pullrequest/${pullRequestId}`,
				closedDate: pullRequestId === 503 ? '2026-05-17T11:20:00Z' : '2026-05-16T11:20:00Z',
				lastMergeCommit: { commitId: `merge-${pullRequestId}` },
				lastMergeSourceCommit: { commitId: `source-${pullRequestId}` },
				lastMergeTargetCommit: { commitId: `target-${pullRequestId}` },
			}),
		);

		const result = await getWorkItemPullRequests(mockClient, {
			ids: '101',
			authors: ['Alice'],
			targetBranches: ['refs/heads/main'],
			statuses: ['completed'],
			sortBy: 'mergedDate',
			sortDirection: 'desc',
			confirmUnfiltered: true,
		});

		expect(result.stage).toBe('complete');
		expect(result.candidateTotal).toBe(3);
		expect(result.matchingTotal).toBe(1);
		expect(result.cherryPick).toEqual({
			commitHashes: ['merge-503'],
			command: 'git cherry-pick -m 1 merge-503',
			skippedPullRequestIds: [],
		});
		expect(result.results?.map((candidate) => candidate.pullRequestId)).toEqual([503]);
	});

	it('preserves source and target hashes for non-merged pull requests', async () => {
		mockDiscoveryGraph();
		mockGitApi.getPullRequest.mockImplementation(
			async (repositoryId: string, pullRequestId: number, projectId?: string) => ({
				repository: { id: repositoryId },
				pullRequestId,
				artifactId: `vstfs:///Git/PullRequestId/${projectId}/${repositoryId}/${pullRequestId}`,
				title: `PR ${pullRequestId}`,
				createdBy: { displayName: pullRequestId === 501 ? 'Alice' : 'Bob' },
				status: pullRequestId === 501 ? PullRequestStatus.Completed : PullRequestStatus.Active,
				targetRefName: pullRequestId === 501 ? 'refs/heads/main' : 'refs/heads/release/2026.05',
				url: `https://dev.azure.com/example/project/_git/${repositoryId}/pullrequest/${pullRequestId}`,
				closedDate: pullRequestId === 501 ? '2026-05-16T11:20:00Z' : undefined,
				lastMergeCommit: pullRequestId === 501 ? { commitId: 'merge-501' } : undefined,
				lastMergeSourceCommit: { commitId: `source-${pullRequestId}` },
				lastMergeTargetCommit: { commitId: `target-${pullRequestId}` },
			}),
		);

		const result = await getWorkItemPullRequests(mockClient, {
			ids: '101',
			statuses: ['active'],
			confirmUnfiltered: true,
		});

		expect(result.stage).toBe('complete');
		expect(result.matchingTotal).toBe(1);
		expect(result.cherryPick).toEqual({
			commitHashes: [],
			command: null,
			skippedPullRequestIds: [502],
		});
		expect(result.results?.[0]).toMatchObject({
			pullRequestId: 502,
			hashes: {
				mergeCommit: null,
				sourceCommit: 'source-502',
				targetCommit: 'target-502',
			},
		});
	});

	it('returns an empty complete result when filters remove every candidate', async () => {
		mockDiscoveryGraph();
		mockGitApi.getPullRequest.mockImplementation(
			async (repositoryId: string, pullRequestId: number, projectId?: string) => ({
				repository: { id: repositoryId },
				pullRequestId,
				artifactId: `vstfs:///Git/PullRequestId/${projectId}/${repositoryId}/${pullRequestId}`,
				title: `PR ${pullRequestId}`,
				createdBy: { displayName: pullRequestId === 501 ? 'Alice' : 'Bob' },
				status: pullRequestId === 501 ? PullRequestStatus.Completed : PullRequestStatus.Active,
				targetRefName: pullRequestId === 501 ? 'refs/heads/main' : 'refs/heads/release/2026.05',
				url: `https://dev.azure.com/example/project/_git/${repositoryId}/pullrequest/${pullRequestId}`,
				closedDate: pullRequestId === 501 ? '2026-05-16T11:20:00Z' : undefined,
				lastMergeCommit: { commitId: pullRequestId === 501 ? 'merge-501' : undefined },
				lastMergeSourceCommit: { commitId: `source-${pullRequestId}` },
				lastMergeTargetCommit: { commitId: `target-${pullRequestId}` },
			}),
		);

		const result = await getWorkItemPullRequests(mockClient, {
			ids: '101',
			authors: ['Nobody'],
			confirmUnfiltered: true,
		});

		expect(result.stage).toBe('complete');
		expect(result.candidateTotal).toBe(2);
		expect(result.matchingTotal).toBe(0);
		expect(result.cherryPick).toEqual({
			commitHashes: [],
			command: null,
			skippedPullRequestIds: [],
		});
		expect(result.results).toEqual([]);
	});

	it('normalizes author, status, and target branch filters from user-facing values', async () => {
		mockWitApi.getWorkItemsBatch.mockResolvedValueOnce([
			{
				...topLevelWorkItem,
				relations: [
					{
						rel: 'ArtifactLink',
						url: 'vstfs:///Git/PullRequestId/project-guid/repo-a/501',
					},
					{
						rel: 'ArtifactLink',
						url: 'vstfs:///Git/PullRequestId/project-guid/repo-b/502',
					},
					{
						rel: 'ArtifactLink',
						url: 'vstfs:///Git/PullRequestId/project-guid/repo-c/503',
					},
				],
			},
		]);
		mockGitApi.getPullRequest.mockImplementation(
			async (repositoryId: string, pullRequestId: number, projectId?: string) => ({
				repository: { id: repositoryId },
				pullRequestId,
				artifactId: `vstfs:///Git/PullRequestId/${projectId}/${repositoryId}/${pullRequestId}`,
				title: `PR ${pullRequestId}`,
				createdBy:
					pullRequestId === 501
						? { displayName: 'Hanh Nguyen' }
						: pullRequestId === 502
							? { displayName: 'Nakeeb Raut' }
							: { displayName: 'Someone Else' },
				status: PullRequestStatus.Completed,
				targetRefName: pullRequestId === 503 ? 'refs/heads/Staging' : 'refs/heads/Dev',
				url: `https://dev.azure.com/example/project/_git/${repositoryId}/pullrequest/${pullRequestId}`,
				closedDate: '2026-05-17T11:20:00Z',
				lastMergeCommit: { commitId: `merge-${pullRequestId}` },
				lastMergeSourceCommit: { commitId: `source-${pullRequestId}` },
				lastMergeTargetCommit: { commitId: `target-${pullRequestId}` },
			}),
		);

		const result = await getWorkItemPullRequests(mockClient, {
			ids: '101',
			authors: ['Hanh Nguyen', 'Nakeeb'],
			targetBranches: ['Dev'],
			statuses: ['Completed'],
			confirmUnfiltered: true,
		});

		expect(result.stage).toBe('complete');
		expect(result.candidateTotal).toBe(3);
		expect(result.matchingTotal).toBe(2);
		expect(result.cherryPick).toEqual({
			commitHashes: ['merge-501', 'merge-502'],
			command: 'git cherry-pick -m 1 merge-501 merge-502',
			skippedPullRequestIds: [],
		});
		expect(result.results?.map((candidate) => candidate.pullRequestId)).toEqual([501, 502]);
	});

	it('includes pull requests linked from all descendants, not only direct children', async () => {
		mockWitApi.getWorkItemsBatch
			.mockResolvedValueOnce([
				{
					...topLevelWorkItem,
					relations: [
						...(topLevelWorkItem.relations ?? []),
						{
							rel: 'System.LinkTypes.Hierarchy-Forward',
							url: 'https://dev.azure.com/example/_apis/wit/workItems/203',
						},
					],
				},
			])
			.mockResolvedValueOnce([
				{
					...childTask,
					relations: [
						...(childTask.relations ?? []),
						{
							rel: 'System.LinkTypes.Hierarchy-Forward',
							url: 'https://dev.azure.com/example/_apis/wit/workItems/303',
						},
					],
				},
				{
					id: 203,
					fields: {
						'System.Title': 'Sibling issue',
						'System.WorkItemType': 'Issue',
						'System.State': 'Done',
					},
					relations: [],
				},
			])
			.mockResolvedValueOnce([
				{
					id: 303,
					fields: {
						'System.Title': 'Grandchild task',
						'System.WorkItemType': 'Task',
						'System.State': 'Done',
					},
					relations: [
						{
							rel: 'ArtifactLink',
							url: 'vstfs:///Git/PullRequestId/project-guid/repo-c/503',
						},
					],
				},
			]);

		mockGitApi.getPullRequest.mockImplementation(
			async (repositoryId: string, pullRequestId: number, projectId?: string) => ({
				repository: { id: repositoryId },
				pullRequestId,
				artifactId: `vstfs:///Git/PullRequestId/${projectId}/${repositoryId}/${pullRequestId}`,
				title: `PR ${pullRequestId}`,
				createdBy: { displayName: 'Alice' },
				status: PullRequestStatus.Completed,
				targetRefName: 'refs/heads/main',
				url: `https://dev.azure.com/example/project/_git/${repositoryId}/pullrequest/${pullRequestId}`,
				lastMergeCommit: { commitId: `merge-${pullRequestId}` },
				lastMergeSourceCommit: { commitId: `source-${pullRequestId}` },
				lastMergeTargetCommit: { commitId: `target-${pullRequestId}` },
			}),
		);

		const result = await getWorkItemPullRequests(mockClient, {
			ids: '101',
			confirmUnfiltered: true,
		});

		expect(result.stage).toBe('complete');
		expect(result.candidateTotal).toBe(3);
		expect(result.matchingTotal).toBe(3);
		expect(result.cherryPick).toEqual({
			commitHashes: ['merge-501', 'merge-502', 'merge-503'],
			command: 'git cherry-pick -m 1 merge-501 merge-502 merge-503',
			skippedPullRequestIds: [],
		});
		expect(result.results?.map((candidate) => candidate.pullRequestId)).toEqual([501, 502, 503]);
		expect(result.results?.find((candidate) => candidate.pullRequestId === 503)).toMatchObject({
			relatedWorkItemIds: [303],
			requestedWorkItemIds: [101],
			childWorkItemIds: [303],
		});
	});

	it('builds one git cherry-pick command from merge commit hashes in result order', async () => {
		mockWitApi.getWorkItemsBatch.mockResolvedValueOnce([
			{
				...topLevelWorkItem,
				relations: [
					{
						rel: 'ArtifactLink',
						url: 'vstfs:///Git/PullRequestId/project-guid/repo-a/701',
					},
					{
						rel: 'ArtifactLink',
						url: 'vstfs:///Git/PullRequestId/project-guid/repo-b/702',
					},
				],
			},
		]);
		mockGitApi.getPullRequest.mockImplementation(
			async (repositoryId: string, pullRequestId: number, projectId?: string) => ({
				repository: { id: repositoryId },
				pullRequestId,
				artifactId: `vstfs:///Git/PullRequestId/${projectId}/${repositoryId}/${pullRequestId}`,
				title: `PR ${pullRequestId}`,
				createdBy: { displayName: 'Alice' },
				status: PullRequestStatus.Completed,
				targetRefName: 'refs/heads/main',
				url: `https://dev.azure.com/example/project/_git/${repositoryId}/pullrequest/${pullRequestId}`,
				closedDate: pullRequestId === 701 ? '2026-05-16T11:20:00Z' : '2026-05-17T11:20:00Z',
				lastMergeCommit: { commitId: `merge-${pullRequestId}` },
				lastMergeSourceCommit: { commitId: `source-${pullRequestId}` },
				lastMergeTargetCommit: { commitId: `target-${pullRequestId}` },
			}),
		);

		const result = await getWorkItemPullRequests(mockClient, {
			ids: '101',
			sortBy: 'mergedDate',
			sortDirection: 'asc',
			confirmUnfiltered: true,
		});

		expect(result.cherryPick).toEqual({
			commitHashes: ['merge-701', 'merge-702'],
			command: 'git cherry-pick -m 1 merge-701 merge-702',
			skippedPullRequestIds: [],
		});
	});
});