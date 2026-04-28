import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    // @nestjs/graphql uses reflect-metadata to read TypeScript decorator param
    // types at schema-build time. Vitest's default esbuild transformer strips
    // design:paramtypes emit, so schema construction crashes with a cryptic
    // "Cannot read properties of undefined (reading '0')". SWC emits the
    // metadata correctly.
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true, legacyDecorator: true },
        keepClassNames: true,
      },
    }),
  ],
  test: {
    globals: false,
    environment: 'node',
    // E2E tests are excluded from the default run because they launch a real
    // browser - opt in explicitly with `pnpm test:e2e`.
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'test/e2e/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
      // Lock in 100% across every dimension. A regression here breaks the
      // test suite so it surfaces in CI; no silent backsliding.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    testTimeout: 15000,
  },
});
