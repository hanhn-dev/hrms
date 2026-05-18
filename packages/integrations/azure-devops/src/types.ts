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
