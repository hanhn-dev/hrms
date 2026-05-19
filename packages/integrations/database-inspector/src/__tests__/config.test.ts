import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DB_MCP_ENGINE: 'sqlserver',
      DB_MCP_HOST: 'localhost',
      DB_MCP_PORT: '1433',
      DB_MCP_DATABASE: 'SampleDb',
      DB_MCP_USER: 'sa',
      DB_MCP_PASSWORD: 'secret',
      DB_MCP_SCHEMA: 'dbo',
      DB_MCP_SSL: 'false',
      DB_MCP_TRUST_SERVER_CERTIFICATE: 'true',
      DB_MCP_CONNECTION_STRING: '',
      DB_MCP_SQLITE_PATH: '',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns normalized config for a network engine', () => {
    const config = loadConfig();

    expect(config.engine).toBe('sqlserver');
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(1433);
    expect(config.database).toBe('SampleDb');
    expect(config.user).toBe('sa');
    expect(config.password).toBe('secret');
    expect(config.schema).toBe('dbo');
    expect(config.ssl).toBe(false);
    expect(config.trustServerCertificate).toBe(true);
  });

  it('requires sqlitePath when the sqlite engine has no connection string', () => {
    process.env.DB_MCP_ENGINE = 'sqlite';
    process.env.DB_MCP_SQLITE_PATH = '';
    process.env.DB_MCP_CONNECTION_STRING = '';
    delete process.env.DB_MCP_HOST;
    delete process.env.DB_MCP_DATABASE;
    delete process.env.DB_MCP_USER;

    expect(() => loadConfig()).toThrow(/DB_MCP_SQLITE_PATH/i);
  });

  it('requires host, database, user, and password when a network engine has no connection string', () => {
    delete process.env.DB_MCP_HOST;

    expect(() => loadConfig()).toThrow(/DB_MCP_HOST/i);
  });

  it('rejects invalid boolean environment values', () => {
    process.env.DB_MCP_SSL = 'maybe';

    expect(() => loadConfig()).toThrow(/DB_MCP_SSL/i);
  });
});
