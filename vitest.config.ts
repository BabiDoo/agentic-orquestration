import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**']
  },
  resolve: {
    alias: {
      '@adzhub/contracts': resolve(__dirname, './packages/contracts/src/index.ts'),
      '@adzhub/data': resolve(__dirname, './packages/data/src/index.ts'),
      '@adzhub/verify': resolve(__dirname, './packages/verify/src/index.ts'),
      '@adzhub/policy': resolve(__dirname, './packages/policy/src/index.ts'),
      '@adzhub/runtime': resolve(__dirname, './packages/runtime/src/index.ts'),
      '@adzhub/tools': resolve(__dirname, './packages/tools/src/index.ts'),
      '@adzhub/apps': resolve(__dirname, './packages/apps/src/index.ts'),
      '@adzhub/creative-analysis': resolve(
        __dirname,
        './packages/apps/creative-analysis/src/index.ts'
      )
    }
  }
});
