import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests for pure logic (maths, permissions, token handling). Component
// rendering is not tested here; `yarn build` remains the integration gate.
export default defineConfig({
  resolve: { alias: { src: path.resolve(import.meta.dirname, 'src') } },
  test: { include: ['src/**/*.test.{js,mjs}'], environment: 'node' },
});
