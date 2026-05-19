import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

type PackageJson = {
  main?: string;
  scripts?: Record<string, string>;
};

const packageJsonPath = fileURLToPath(new URL('../../package.json', import.meta.url));
const rootPackageJsonPath = fileURLToPath(new URL('../../../../package.json', import.meta.url));
const tsdownConfigPath = fileURLToPath(new URL('../../tsdown.config.ts', import.meta.url));

const readJson = (filePath: string): PackageJson => {
  const packageJsonText = readFileSync(filePath, 'utf8');
  return JSON.parse(packageJsonText) as PackageJson;
};

describe('db-mcp bundle contract', () => {
  it('uses tsdown for the app build', () => {
    const packageJson = readJson(packageJsonPath);

    expect(packageJson.scripts?.build).toContain('tsdown');
  });

  it('preserves dist/index.js as the runtime entry', () => {
    const packageJson = readJson(packageJsonPath);

    expect(packageJson.main).toBe('./dist/index.js');
    expect(packageJson.scripts?.start).toContain('dist/index.js');
    expect(packageJson.scripts?.inspect).toContain('dist/index.js');
  });

  it('defines an app-local tsdown config that externalizes runtime-sensitive drivers', () => {
    expect(existsSync(tsdownConfigPath)).toBe(true);

    const configText = readFileSync(tsdownConfigPath, 'utf8');

    expect(configText).toContain('src/index.ts');
    expect(configText).toContain('mssql');
    expect(configText).toContain('mysql2');
    expect(configText).toContain('pg');
    expect(configText).toContain('oracledb');
  });

  it('keeps the root inspect workflow aligned without a redundant shared-package prebuild', () => {
    const rootPackageJson = readJson(rootPackageJsonPath);

    expect(rootPackageJson.scripts?.['inspect:db']).toContain('npm run build --workspace=apps/db-mcp');
    expect(rootPackageJson.scripts?.['inspect:db']).toContain('./apps/db-mcp/dist/index.js');
    expect(rootPackageJson.scripts?.['inspect:db']).not.toContain('packages/integrations/database-inspector');
  });
});