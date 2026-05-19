import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client as PgClient } from 'pg';

import { getCatalog } from '../catalog.js';
import { getObjectDetails } from '../object-details.js';
import { getStoredProcedureDependencies, getStoredProcedureScript } from '../procedures.js';
import type { DatabaseMcpConfig } from '../types.js';

const postgresConnectionString = process.env.DB_MCP_POSTGRES_TEST_CONNECTION_STRING?.trim();
const describePostgresIntegration = postgresConnectionString ? describe : describe.skip;

describePostgresIntegration('Postgres runtime integration', () => {
  let client: any;
  let schemaName = '';
  let config: DatabaseMcpConfig;

  beforeAll(async () => {
    if (!postgresConnectionString) {
      throw new Error('DB_MCP_POSTGRES_TEST_CONNECTION_STRING is required for Postgres integration tests.');
    }

    client = new PgClient({ connectionString: postgresConnectionString });
    await client.connect();

    schemaName = `db_mcp_${randomUUID().replace(/-/g, '_')}`;
    await client.query(`CREATE SCHEMA ${schemaName}`);
    await client.query(`
      CREATE TABLE ${schemaName}.users (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email TEXT NOT NULL UNIQUE
      );

      CREATE TABLE ${schemaName}.projects (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL REFERENCES ${schemaName}.users(id)
      );

      CREATE VIEW ${schemaName}.project_directory AS
      SELECT p.id, p.name, u.email AS owner_email
      FROM ${schemaName}.projects AS p
      INNER JOIN ${schemaName}.users AS u ON u.id = p.owner_id;

      CREATE OR REPLACE PROCEDURE ${schemaName}.sync_projects(IN owner_email TEXT)
      LANGUAGE SQL
      AS $$
        SELECT p.name
        FROM ${schemaName}.projects AS p
        INNER JOIN ${schemaName}.users AS u ON u.id = p.owner_id
        WHERE u.email = owner_email;
      $$;
    `);

    config = {
      engine: 'postgres',
      connectionString: postgresConnectionString,
      host: undefined,
      port: undefined,
      database: undefined,
      user: undefined,
      password: undefined,
      schema: schemaName,
      ssl: false,
      trustServerCertificate: false,
      sqlitePath: undefined,
    };
  });

  afterAll(async () => {
    if (!client || !schemaName) {
      return;
    }

    await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await client.end();
  });

  it('returns catalog objects and relationship metadata from a live Postgres schema', async () => {
    const catalog = await getCatalog(config, {
      schema: schemaName,
      includeRelationships: true,
    });

    expect(catalog.engine).toBe('postgres');
    expect(catalog.schemas).toEqual([schemaName]);
    expect(catalog.objects.map((object) => `${object.schema}.${object.name}`)).toEqual([
      `${schemaName}.project_directory`,
      `${schemaName}.projects`,
      `${schemaName}.sync_projects`,
      `${schemaName}.users`,
    ]);
    expect(catalog.relationships).toHaveLength(1);
    expect(catalog.relationships[0]?.label).toBe('projects.owner_id -> users.id');
  });

  it('returns object details and stored procedure insight from a live Postgres schema', async () => {
    const tableDetails = await getObjectDetails(config, {
      schema: schemaName,
      name: 'projects',
      kind: 'table',
      includeDependents: true,
    });

    expect(tableDetails.object.id).toBe(`${schemaName}.projects`);
    expect(tableDetails.columns.map((column) => column.name)).toEqual(['id', 'name', 'owner_id']);
    expect(tableDetails.relationships).toHaveLength(1);
    expect(tableDetails.relationships[0]?.label).toBe('projects.owner_id -> users.id');
    expect(tableDetails.dependents.map((dependent) => dependent.objectId)).toContain(`${schemaName}.project_directory`);

    const scriptInsight = await getStoredProcedureScript(config, {
      schema: schemaName,
      name: 'sync_projects',
    });

    expect(scriptInsight.script).toContain('CREATE OR REPLACE PROCEDURE');
    expect(scriptInsight.script).toContain(`${schemaName}.sync_projects`);
    expect(scriptInsight.scriptUnavailableReason).toBeNull();

    const dependencyInsight = await getStoredProcedureDependencies(config, {
      schema: schemaName,
      name: 'sync_projects',
      includeDependents: true,
    });

    expect(dependencyInsight.dependencies.map((dependency) => dependency.objectId)).toEqual(
      expect.arrayContaining([`${schemaName}.projects`, `${schemaName}.users`]),
    );
    expect(dependencyInsight.warnings).toEqual([]);
  });
});