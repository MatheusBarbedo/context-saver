import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundlerFilters } from '../src/filters/bundler.js';

const bundler = bundlerFilters[0];

test('build de bundler resume assets e mantém erros', () => {
  const lines = [
    ...Array.from({ length: 60 }, (_, i) => `transforming module ${i}`),
    'dist/index.js  120 kB',
    'error during build: X',
  ].join('\n');
  const out = bundler.run({ command: 'vite build', stdout: lines, stderr: '', exitCode: 1 });
  assert.match(out, /dist\/index\.js/);
  assert.match(out, /error during build/);
});

test('saída curta passa intacta', () => {
  const out = bundler.run({ command: 'vite build', stdout: 'done', stderr: '', exitCode: 0 });
  assert.equal(out, null);
});
