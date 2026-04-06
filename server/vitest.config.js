import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup/testEnv.js'],
    clearMocks: true,
    restoreMocks: true,
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'json-summary'],
    reportsDirectory: './coverage',
    exclude: [
      'node_modules/**',
      '**/server.js',
      'src/__tests__/**',
    ],
  },
});
