// Reference https://github.com/sapphiredev/utilities/blob/main/scripts/vitest.config.ts
import type { ESBuildOptions } from 'vite';
import { defineConfig, type UserConfig } from 'vitest/config';

export const createVitestConfig = (options: UserConfig = {}) =>
  defineConfig({
    ...options,
    test: {
      ...options?.test,
      environment: 'node',
      testTimeout: 60000,
      globals: true,
      coverage: {
        ...options.test?.coverage,
        enabled: false,
        provider: 'v8',
        reporter: ['text', 'lcov', 'clover'],
        exclude: [
          ...(options.test?.coverage?.exclude ?? []),
          '**/node_modules/**',
          '**/dist/**',
          '**/tests/**',
        ],
      },
    },
    esbuild: {
      ...options?.esbuild,
      platform: 'node',
      target:
        (options?.esbuild as ESBuildOptions | undefined)?.target ?? 'esnext',
    },
  });
