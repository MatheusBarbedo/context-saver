import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchFilters } from '../src/filters/search.js';

const search = searchFilters[0];

test('grep com muitos hits vira contagem + amostra', () => {
  const hits = Array.from({ length: 300 }, (_, i) => `src/f${i}.js:1: match`).join('\n');
  const out = search.run({ command: 'grep -rn match .', stdout: hits, stderr: '', exitCode: 0 });
  assert.match(out, /300 resultados/);
  assert.match(out, /linhas ocultas/);
});

test('poucos hits passam intactos', () => {
  const out = search.run({ command: 'grep x .', stdout: 'a\nb', stderr: '', exitCode: 0 });
  assert.equal(out, null);
});
