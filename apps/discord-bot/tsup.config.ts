import { defineConfig } from 'tsup';

export default defineConfig({
    bundle: true,
    dts: false,
    entry: ['src/**/*.ts', '!src/**/*.d.ts', 'src/**/*.tsx'],
    format: ['cjs'],
    minify: false,
    tsconfig: 'tsconfig.json',
    target: 'esnext',
    splitting: false,
    skipNodeModulesBundle: true,
    sourcemap: true,
    shims: true,
    keepNames: true,
    noExternal: ['@answeroverflow/api', '@answeroverflow/auth', '@answeroverflow/db'],
});
