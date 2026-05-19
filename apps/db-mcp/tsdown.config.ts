/// <reference types="node" />

import { fileURLToPath } from 'node:url';

import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  alias: {
    '@hrms/database-inspector': fileURLToPath(
      new URL('../../packages/integrations/database-inspector/src/index.ts', import.meta.url),
    ),
  },
  clean: true,
  deps: {
    neverBundle: ['mssql', 'mysql2', 'pg', 'oracledb'],
  },
  dts: false,
  fixedExtension: false,
  format: 'esm',
  hash: false,
  outDir: 'dist',
  platform: 'node',
  target: 'node20',
});