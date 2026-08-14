import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

type PackageJson = {
  main?: string;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
};

const packageJsonPath = fileURLToPath(new URL('../../package.json', import.meta.url));
const rootPackageJsonPath = fileURLToPath(new URL('../../../../package.json', import.meta.url));
const tsdownConfigPath = fileURLToPath(new URL('../../tsdown.config.ts', import.meta.url));

const readJson = (filePath: string): PackageJson => {
  const packageJsonText = readFileSync(filePath, 'utf8');
  return JSON.parse(packageJsonText) as PackageJson;
};

describe('az-mcp bundle contract', () => {
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

  it('defines an app-local tsdown config for src/index.ts', () => {
    expect(existsSync(tsdownConfigPath)).toBe(true);

    const configText = readFileSync(tsdownConfigPath, 'utf8');

    expect(configText).toContain('src/index.ts');
    expect(configText).toContain('dist');
  });

  it('keeps the root inspect workflow aligned with the app bundle contract', () => {
    const rootPackageJson = readJson(rootPackageJsonPath);

    expect(rootPackageJson.scripts?.['inspect:az']).toContain('npm run build --workspace=apps/az-mcp');
    expect(rootPackageJson.scripts?.['inspect:az']).toContain('./apps/az-mcp/dist/index.js');
  });

  it('defines a standalone handoff build that inlines the workspace package', () => {
    const packageJson = readJson(packageJsonPath);
    const standalonePackageJsonPath = fileURLToPath(
      new URL('../../standalone/package.json', import.meta.url),
    );
    const standaloneConfigPath = fileURLToPath(
      new URL('../../tsdown.standalone.config.ts', import.meta.url),
    );
    const standalonePackageJson = readJson(standalonePackageJsonPath);
    const standaloneConfigText = readFileSync(standaloneConfigPath, 'utf8');

    expect(packageJson.scripts?.['build:standalone']).toContain('tsdown.standalone.config.ts');
    expect(packageJson.scripts?.['pack:standalone']).toContain('npm pack ./standalone');
    expect(existsSync(standaloneConfigPath)).toBe(true);
    expect(standaloneConfigText).toContain('standalone/dist');
    expect(standaloneConfigText).toContain('neverBundle: true');
    expect(standaloneConfigText).toContain("alwaysBundle: ['@hrms/azure-devops']");
    expect(standalonePackageJson.type).toBe('module');
    expect(standalonePackageJson.main).toBe('./dist/index.js');
    expect(standalonePackageJson.scripts?.start).toContain('dist/index.js');
    expect(standalonePackageJson.dependencies).toEqual({
      '@modelcontextprotocol/sdk': '1.30.0',
      'azure-devops-node-api': '15.1.2',
      turndown: '7.2.4',
      zod: '4.4.3',
    });
    expect(standalonePackageJson.dependencies).not.toHaveProperty('@hrms/azure-devops');
  });
});