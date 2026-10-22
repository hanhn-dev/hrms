import {
  createWorkItem,
  CREATE_WORK_ITEM_DEFAULTS,
  WORK_ITEM_TYPE_OPTIONS,
  type AzureDevOpsClient,
  type AzureDevOpsConfig,
  type CreateWorkItemInput,
  type WorkItemTypeOption,
} from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export type CreateWorkItemToolArgs = {
  title: string;
  description?: string;
  type?: WorkItemTypeOption;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string[];
  priority?: number;
  acceptanceCriteria?: string;
  parentId?: number;
  project?: string;
};

export function createCreateWorkItemHandler(client: AzureDevOpsClient, config: AzureDevOpsConfig) {
  return async (args: CreateWorkItemToolArgs): Promise<ToolResult> => {
    try {
      const input: CreateWorkItemInput = {
        title: args.title,
        description: args.description,
        type: args.type,
        assignedTo: args.assignedTo,
        areaPath: args.areaPath,
        iterationPath: args.iterationPath,
        tags: args.tags,
        priority: args.priority,
        acceptanceCriteria: args.acceptanceCriteria,
        parentId: args.parentId,
        project: args.project,
      };
      const workItem = await createWorkItem(client, input, config);
      return {
        content: [{ type: 'text', text: JSON.stringify(workItem) }],
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

export { CREATE_WORK_ITEM_DEFAULTS, WORK_ITEM_TYPE_OPTIONS };
