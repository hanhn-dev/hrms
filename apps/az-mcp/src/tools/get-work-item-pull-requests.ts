import { AzureDevOpsClient, getWorkItemPullRequests } from '@hrms/azure-devops';
import type {
  PullRequestLookupResponse,
  PullRequestSortDirection,
  PullRequestSortField,
  WorkItemPullRequestLookupRequest,
} from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export type GetWorkItemPullRequestsArgs = WorkItemPullRequestLookupRequest & {
  ids: string;
  authors?: readonly string[];
  targetBranches?: readonly string[];
  statuses?: readonly string[];
  sortBy?: PullRequestSortField;
  sortDirection?: PullRequestSortDirection;
  confirmUnfiltered?: boolean;
};

type ElicitationContent = Record<string, string | number | boolean | string[] | undefined>;

type FormElicitationRequest = {
  mode?: 'form';
  message: string;
  requestedSchema: {
    type: 'object';
    properties: Record<string, unknown>;
  };
};

type FormElicitationResult = {
  action: 'accept' | 'decline' | 'cancel';
  content?: ElicitationContent;
};

type HandlerOptions = {
  elicitInput?: (params: FormElicitationRequest) => Promise<FormElicitationResult>;
};

function buildRefinementSchema(result: PullRequestLookupResponse): FormElicitationRequest | null {
  if (result.facets === null) {
    return null;
  }

  const properties: Record<string, unknown> = {
    sortBy: {
      type: 'string',
      title: 'Sort field',
      description: 'How should the final PR list be sorted?',
      enum: result.facets.sortFields,
      default: 'mergedDate',
    },
    sortDirection: {
      type: 'string',
      title: 'Sort direction',
      description: 'What direction should the final PR list use?',
      enum: ['desc', 'asc'],
      default: 'desc',
    },
  };

  if (result.facets.authors.length > 0) {
    properties.authors = {
      type: 'array',
      title: 'Authors',
      description: 'Select one or more authors to keep. Leave empty to keep all authors.',
      items: {
        type: 'string',
        enum: result.facets.authors,
      },
      default: [],
    };
  }

  if (result.facets.targetBranches.length > 0) {
    properties.targetBranches = {
      type: 'array',
      title: 'Target branches',
      description: 'Select one or more target branches to keep. Leave empty to keep all branches.',
      items: {
        type: 'string',
        enum: result.facets.targetBranches,
      },
      default: [],
    };
  }

  if (result.facets.statuses.length > 0) {
    properties.statuses = {
      type: 'array',
      title: 'Statuses',
      description: 'Select one or more PR statuses to keep. Leave empty to keep all statuses.',
      items: {
        type: 'string',
        enum: result.facets.statuses,
      },
      default: [],
    };
  }

  return {
    mode: 'form',
    message: `I found ${result.candidateTotal} linked pull requests. Select any filters and sort options before I return the final result. Leave filter lists empty to keep all pull requests.`,
    requestedSchema: {
      type: 'object',
      properties,
    },
  };
}

function readStringArray(content: ElicitationContent | undefined, key: 'authors' | 'targetBranches' | 'statuses'): string[] | undefined {
  const value = content?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalizedValues = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return normalizedValues.length > 0 ? normalizedValues : undefined;
}

function readStringEnum<T extends string>(
  content: ElicitationContent | undefined,
  key: string,
  allowedValues: readonly T[],
): T | undefined {
  const value = content?.[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  return allowedValues.includes(value as T) ? (value as T) : undefined;
}

function mergeSelectedArray(
  existingValues: readonly string[] | undefined,
  selectedValues: string[] | undefined,
): readonly string[] | undefined {
  return selectedValues ?? existingValues;
}

export function createGetWorkItemPullRequestsHandler(client: AzureDevOpsClient, options: HandlerOptions = {}) {
  return async (args: GetWorkItemPullRequestsArgs): Promise<ToolResult> => {
    try {
      let result = await getWorkItemPullRequests(client, args);

      if (result.stage === 'needs_refinement' && options.elicitInput !== undefined) {
        const elicitationRequest = buildRefinementSchema(result);

        if (elicitationRequest !== null) {
          try {
            const elicitationResult = await options.elicitInput(elicitationRequest);

            if (elicitationResult.action === 'accept') {
              result = await getWorkItemPullRequests(client, {
                ...args,
                authors: mergeSelectedArray(args.authors, readStringArray(elicitationResult.content, 'authors')),
                targetBranches: mergeSelectedArray(args.targetBranches, readStringArray(elicitationResult.content, 'targetBranches')),
                statuses: mergeSelectedArray(args.statuses, readStringArray(elicitationResult.content, 'statuses')),
                sortBy: readStringEnum(elicitationResult.content, 'sortBy', ['mergedDate', 'pullRequestId']) ?? args.sortBy,
                sortDirection: readStringEnum(elicitationResult.content, 'sortDirection', ['asc', 'desc']) ?? args.sortDirection,
                confirmUnfiltered: true,
              });
            }
          } catch {
            // Fallback to the staged JSON payload when the client does not support elicitation.
          }
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      };
    }
  };
}