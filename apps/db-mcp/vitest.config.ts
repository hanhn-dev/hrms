import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@hrms/database-inspector': new URL('../../packages/integrations/database-inspector/src/index.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    exclude: ['dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
  },
});
