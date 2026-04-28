import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', '**/*.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  unicorn.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Unicorn opinions this library opts out of:
      // - Null is used by graphql-js APIs; refusing it is impractical here.
      'unicorn/no-null': 'off',
      // String.raw is our template-literal escape; switching to Array.join
      // hurts readability.
      'unicorn/prefer-string-raw': 'off',
      // Our filenames (graphql-docs.module.ts, docs-model.ts) follow NestJS
      // conventions, not unicorn's kebab-case preference.
      'unicorn/filename-case': 'off',
      // Abbreviations like "args", "params", "props", "ref" are canonical in
      // this ecosystem (NestJS, GraphQL, TS). Turning this on generates noise.
      'unicorn/prevent-abbreviations': 'off',
      // process.env lookups at module load are fine for a library.
      'unicorn/no-process-exit': 'off',
      // Readability call for our tiny array maps / filters.
      'unicorn/no-array-reduce': 'off',
      // graphql-js returns Array-like objects where Array.from rewrites do
      // not carry across realms - see walker.ts cross-realm comments.
      'unicorn/prefer-spread': 'off',
      // Would force us to add dependency injection of a "good" set constructor
      // where the plain literal is clearer.
      'unicorn/prefer-set-has': 'off',
      // Disabled: vitest's test globals would trip this; we import explicitly.
      'unicorn/consistent-function-scoping': 'off',
      // Forcing `.map(x => toEntry(x))` over `.map(toEntry)` is purely
      // stylistic and makes tight transformation pipelines noisier.
      'unicorn/no-array-callback-reference': 'off',
      // `else if` ladders with 3-4 branches are clearer than `switch` for
      // our tag-parsing and type-inspection code.
      'unicorn/prefer-switch': 'off',
    },
  },
  {
    // Tests deliberately call functions with `undefined` to exercise the
    // accepts-undefined behavior of the production signature; the rule would
    // force rewriting tests to omit an argument, which changes what's tested.
    files: ['test/**/*.ts'],
    rules: {
      'unicorn/no-useless-undefined': 'off',
    },
  },
);
