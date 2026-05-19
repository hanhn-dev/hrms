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
});