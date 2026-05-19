import { z } from 'zod';

import type { DatabaseEngine, DatabaseMcpConfig } from './types.js';

const BooleanEnvSchema = z.enum(['true', 'false']).default('false').transform((value) => value === 'true');

const ConfigSchema = z.object({
  DB_MCP_ENGINE: z.enum(['sqlserver', 'mysql', 'postgres', 'oracle', 'sqlite']),
  DB_MCP_CONNECTION_STRING: z.string().optional(),
  DB_MCP_HOST: z.string().optional(),
  DB_MCP_PORT: z.string().optional(),
  DB_MCP_DATABASE: z.string().optional(),
  DB_MCP_USER: z.string().optional(),
  DB_MCP_PASSWORD: z.string().optional(),
  DB_MCP_SCHEMA: z.string().optional(),
  DB_MCP_SSL: BooleanEnvSchema,
  DB_MCP_TRUST_SERVER_CERTIFICATE: BooleanEnvSchema,
  DB_MCP_SQLITE_PATH: z.string().optional(),
}).superRefine((value, context) => {
  const connectionString = optionalString(value.DB_MCP_CONNECTION_STRING);
  const sqlitePath = optionalString(value.DB_MCP_SQLITE_PATH);

  if (value.DB_MCP_ENGINE === 'sqlite') {
    if (!connectionString && !sqlitePath) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DB_MCP_SQLITE_PATH is required when DB_MCP_ENGINE=sqlite and no connection string is supplied.',
        path: ['DB_MCP_SQLITE_PATH'],
      });
    }
    return;
  }

  if (connectionString) {
    return;
  }

  requireField(context, value.DB_MCP_HOST, 'DB_MCP_HOST');
  requireField(context, value.DB_MCP_DATABASE, 'DB_MCP_DATABASE');
  requireField(context, value.DB_MCP_USER, 'DB_MCP_USER');
  requireField(context, value.DB_MCP_PASSWORD, 'DB_MCP_PASSWORD');
});

export function loadConfig(source: NodeJS.ProcessEnv = process.env): DatabaseMcpConfig {
  const parsed = ConfigSchema.parse(source);

  return {
    engine: parsed.DB_MCP_ENGINE as DatabaseEngine,
    connectionString: optionalString(parsed.DB_MCP_CONNECTION_STRING),
    host: optionalString(parsed.DB_MCP_HOST),
    port: optionalInteger(parsed.DB_MCP_PORT),
    database: optionalString(parsed.DB_MCP_DATABASE),
    user: optionalString(parsed.DB_MCP_USER),
    password: optionalString(parsed.DB_MCP_PASSWORD),
    schema: optionalString(parsed.DB_MCP_SCHEMA),
    ssl: parsed.DB_MCP_SSL,
    trustServerCertificate: parsed.DB_MCP_TRUST_SERVER_CERTIFICATE,
    sqlitePath: optionalString(parsed.DB_MCP_SQLITE_PATH),
  };
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalInteger(value: string | undefined): number | undefined {
  const normalized = optionalString(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function requireField(context: z.RefinementCtx, value: string | undefined, name: string): void {
  if (!optionalString(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} is required when no DB_MCP_CONNECTION_STRING is supplied.`,
      path: [name],
    });
  }
}
