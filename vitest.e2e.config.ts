import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// Separate config so E2E stays opt-in and gets longer timeouts - booting Nest
// and launching Chromium per test file is slow vs. the unit suite's
// ~1-second wall clock.
export default defineConfig({
  plugins: [
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
    include: ['test/e2e/**/*.e2e.test.ts'],
    passWithNoTests: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallel: false,
  },
});
