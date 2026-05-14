import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AZURE_DEVOPS_ORG_URL: 'https://dev.azure.com/myorg',
      AZURE_DEVOPS_PROJECT: 'MyProject',
      AZURE_DEVOPS_TOKEN: 'my-pat-token',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid config when all env vars are set', () => {
    const config = loadConfig();
    expect(config.orgUrl).toBe('https://dev.azure.com/myorg');
    expect(config.project).toBe('MyProject');
    expect(config.token).toBe('my-pat-token');
  });

  it('throws ZodError when AZURE_DEVOPS_TOKEN is missing', () => {
    delete process.env['AZURE_DEVOPS_TOKEN'];
    expect(() => loadConfig()).toThrow();
  });

  it('throws ZodError when AZURE_DEVOPS_PROJECT is missing', () => {
    delete process.env['AZURE_DEVOPS_PROJECT'];
    expect(() => loadConfig()).toThrow();
  });

  it('throws ZodError when AZURE_DEVOPS_ORG_URL is not a valid URL', () => {
    process.env['AZURE_DEVOPS_ORG_URL'] = 'not-a-valid-url';
    expect(() => loadConfig()).toThrow();
  });

  it('does not expose the token in the thrown error message', () => {
    delete process.env['AZURE_DEVOPS_ORG_URL'];
    expect(() => loadConfig()).toThrow();
  });
});
