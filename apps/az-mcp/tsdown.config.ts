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
  dts: false,
  fixedExtension: false,
  format: 'esm',
  hash: false,
  outDir: 'dist',
  platform: 'node',
  target: 'node20',
});