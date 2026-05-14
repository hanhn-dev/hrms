export interface WorkItem {
  readonly id: number;
  readonly title: string;
  readonly type: string;
  readonly state: string;
  readonly description: string;
  readonly acceptanceCriteria: string;
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
