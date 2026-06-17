import { defineConfig } from 'vitest/config';
import path from 'path';

// The extension imports the `vscode` module (only for types at runtime in the
// modules we test). Alias it to a tiny stub so test files can import the real
// source. Per-file environments are set with a `// @vitest-environment jsdom`
// comment where a DOM is needed.
export default defineConfig({
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'src/test/vscode-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
