import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genericFilters } from '../src/filters/generic.js';
import { findFilter } from '../src/filters/index.js';

const generic = genericFilters[0];

test('generic corta o miolo de saída longa mantendo cabeça e cauda', () => {
  const lines = Array.from({ length: 200 }, (_, i) => `linha ${i}`).join('\n');
  const out = generic.run({ command: 'qualquer-coisa', stdout: lines, stderr: '', exitCode: 0 });
  assert.match(out, /linha 0/);
  assert.match(out, /linha 199/);
  assert.match(out, /linhas ocultas/);
});

test('generic não mexe em saída curta', () => {
  const out = generic.run({ command: 'x', stdout: 'a\nb\nc', stderr: '', exitCode: 0 });
  assert.equal(out, null);
});

test('generic nunca ganha de filtro específico', () => {
  assert.equal(findFilter('git status').name, 'git-status');
});
