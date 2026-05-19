import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { DatabaseMcpConfig } from '@hrms/database-inspector';

import { createAddRelationshipHandler } from './tools/add-relationship.js';
import { createAlterTableHandler } from './tools/alter-table.js';
import { createCreateTableHandler } from './tools/create-table.js';
import { createGetCatalogHandler } from './tools/get-catalog.js';
import { createGetObjectDetailsHandler } from './tools/get-object-details.js';
import { createGetStoredProcedureDependenciesHandler } from './tools/get-stored-procedure-dependencies.js';
import { createGetStoredProcedureScriptHandler } from './tools/get-stored-procedure-script.js';
import type { ToolCallback, ToolResult } from './tool-types.js';

export function createServer(config: DatabaseMcpConfig): McpServer {
  const server = new McpServer(
    {
      name: 'db-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  registerTool(
    server,
    'db_get_catalog',
    'Return the current database catalog for the configured database connection.',
    {
      schema: z.string().min(1).optional(),
      kinds: z.array(z.enum(['table', 'view', 'storedProcedure', 'trigger', 'function', 'sequence'])).optional(),
      includeRelationships: z.boolean().optional(),
    },
    createGetCatalogHandler(config),
  );

  registerTool(
    server,
    'db_get_object_details',
    'Return detailed metadata for one schema-qualified database object.',
    {
      schema: z.string().min(1),
      name: z.string().min(1),
      kind: z.enum(['table', 'view', 'storedProcedure', 'trigger', 'function', 'sequence']),
      includeDependents: z.boolean().optional(),
    },
    createGetObjectDetailsHandler(config),
  );

  registerTool(
    server,
    'db_create_table',
    'Create a new table using a structured DDL request.',
    {
      schema: z.string().min(1).optional(),
      name: z.string().min(1),
      columns: z.array(
        z.object({
          name: z.string().min(1),
          dataType: z.string().min(1),
          nullable: z.boolean(),
          primaryKey: z.boolean().optional(),
          unique: z.boolean().optional(),
          defaultValue: z.string().optional(),
        }),
      ).min(1),
      primaryKey: z.array(z.string().min(1)).optional(),
      ifNotExists: z.boolean().optional(),
    },
    createCreateTableHandler(config),
  );

  registerTool(
    server,
    'db_alter_table',
    'Alter an existing table using a structured change request.',
    {
      schema: z.string().min(1).optional(),
      name: z.string().min(1),
      renameTo: z.string().min(1).optional(),
      addColumns: z.array(
        z.object({
          name: z.string().min(1),
          dataType: z.string().min(1),
          nullable: z.boolean(),
          primaryKey: z.boolean().optional(),
          unique: z.boolean().optional(),
          defaultValue: z.string().optional(),
        }),
      ).optional(),
      alterColumns: z.array(z.object({
        name: z.string().min(1),
        nextName: z.string().min(1).optional(),
        dataType: z.string().min(1).optional(),
        nullable: z.boolean().optional(),
        defaultValue: z.string().nullable().optional(),
      })).optional(),
      dropColumns: z.array(z.string().min(1)).optional(),
      addConstraints: z.array(z.object({
        name: z.string().min(1),
        kind: z.enum(['primaryKey', 'unique', 'check', 'foreignKey']),
        columns: z.array(z.string().min(1)).optional(),
        expression: z.string().optional(),
      })).optional(),
      dropConstraints: z.array(z.string().min(1)).optional(),
    },
    createAlterTableHandler(config),
  );

  registerTool(
    server,
    'db_add_relationship',
    'Add a relationship between two existing tables.',
    {
      fromSchema: z.string().min(1).optional(),
      fromTable: z.string().min(1),
      fromColumn: z.string().min(1),
      toSchema: z.string().min(1).optional(),
      toTable: z.string().min(1),
      toColumn: z.string().min(1),
      constraintName: z.string().min(1).optional(),
      onDelete: z.enum(['cascade', 'setNull', 'restrict', 'noAction']).optional(),
      onUpdate: z.enum(['cascade', 'setNull', 'restrict', 'noAction']).optional(),
    },
    createAddRelationshipHandler(config),
  );

  registerTool(
    server,
    'db_get_stored_procedure_script',
    'Return the current stored procedure definition when the configured engine exposes it.',
    {
      schema: z.string().min(1),
      name: z.string().min(1),
    },
    createGetStoredProcedureScriptHandler(config),
  );

  registerTool(
    server,
    'db_get_stored_procedure_dependencies',
    'Return direct dependencies and dependents for a stored procedure when supported by the configured engine.',
    {
      schema: z.string().min(1),
      name: z.string().min(1),
      includeDependents: z.boolean().optional(),
    },
    createGetStoredProcedureDependenciesHandler(config),
  );

  return server;
}

export function registerTool(
  server: McpServer,
  name: string,
  description: string,
  schema: Record<string, z.ZodTypeAny>,
  cb: ToolCallback,
): void {
  const register = server.tool.bind(server) as unknown as (
    name: string,
    description: string,
    schema: Record<string, z.ZodTypeAny>,
    cb: (args: Record<string, unknown>) => Promise<ToolResult>,
  ) => void;

  register(name, description, schema, cb);
}
