import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { config } from 'dotenv';

// Carrega .env local automaticamente para os testes live
config({ path: resolve(__dirname, '.env') });

const isLiveMode = process.env.TEST_MODE === 'live';
const liveTimeout = parseInt(process.env.LIVE_TEST_TIMEOUT_MS ?? '60000', 10);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Inclui TODOS os testes (mock + live)
    include: [
      '**/*.test.ts',
      '**/*.live.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Se não estiver em modo live, exclui testes que precisam de API key
      ...(!isLiveMode ? ['**/*.live.test.ts'] : []),
    ],
    // Timeout estendido para testes com LLM real
    testTimeout: isLiveMode ? liveTimeout : 10000,
    // Variáveis injetadas em todos os testes
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '',
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
      TEST_MODE: process.env.TEST_MODE ?? 'mock',
      LIVE_TEST_SCENARIOS: process.env.LIVE_TEST_SCENARIOS ?? 'S0,S1,S5',
    },
    // Reporter mais detalhado para testes live
    reporter: isLiveMode ? 'verbose' : 'default',
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
