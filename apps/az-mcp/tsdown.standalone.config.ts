/// <reference types="node" />

import { fileURLToPath } from 'node:url';

import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  alias: {
    '@hrms/azure-devops': fileURLToPath(
      new URL('../../packages/integrations/azure-devops/src/index.ts', import.meta.url),
    ),
  },
  clean: true,
  deps: {
    neverBundle: true,
    alwaysBundle: ['@hrms/azure-devops'],
  },
  dts: false,
  fixedExtension: false,
  format: 'esm',
  hash: false,
  outDir: 'standalone/dist',
  platform: 'node',
  target: 'node20',
});
