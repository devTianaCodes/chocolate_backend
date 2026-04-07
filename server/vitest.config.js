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
    include: ['src/**/*.js'],
    exclude: [
      'node_modules/**',
      'server.js',
      '**/server.js',
      'scripts/**',
      '**/scripts/**',
      'src/__tests__/**',
    ],
  },
});
