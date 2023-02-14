import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.d.ts', 'src/**/*.tsx', '!src/**/*.test.ts*'],
  skipNodeModulesBundle: true,
  noExternal: [
    "@answeroverflow/elastic-types",
    "@answeroverflow/prisma-types",
    '@answeroverflow/db',
    '@answeroverflow/auth',
    '@answeroverflow/api',
    "@answeroverflow/discordjs-utils",
    "@answeroverflow/utils"
  ],
});
