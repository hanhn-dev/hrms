import { createOperationErrorResult, type DatabaseMcpConfig } from '@hrms/database-inspector';

export interface TextContent {
  readonly type: 'text';
  readonly text: string;
}

export interface ToolResult {
  readonly content: readonly TextContent[];
  readonly isError?: boolean;
}

export type ToolCallback = (args: Record<string, unknown>) => Promise<ToolResult>;

export function jsonToolResult(payload: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  };
}

export function errorToolResult(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export function operationErrorToolResult(
  config: DatabaseMcpConfig,
  operation: string,
  error: unknown,
  affectedObjects: readonly string[] = [],
): ToolResult {
  return jsonToolResult(createOperationErrorResult(config.engine, operation, error, affectedObjects));
}
