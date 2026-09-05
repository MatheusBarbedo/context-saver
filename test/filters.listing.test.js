import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listingFilters } from '../src/filters/listing.js';
import { findFilter } from '../src/filters/index.js';

const f = listingFilters[0];

test('casa ls/dir/tree', () => {
  assert.ok(f.test('ls -la'));
  assert.ok(f.test('tree src'));
  assert.equal(f.test('git status'), false);
});

test('listagem longa vira contagem + primeiras linhas', () => {
  const many = Array.from({ length: 200 }, (_, i) => `file_${i}.txt`).join('\n');
  const out = f.run({ command: 'ls', stdout: many, stderr: '', exitCode: 0 });
  assert.match(out, /200 itens/);
  assert.match(out, /file_0\.txt/);
  assert.doesNotMatch(out, /file_199\.txt/);
});

test('findFilter roteia comando para o filtro certo e retorna null p/ desconhecido', () => {
  assert.equal(findFilter('git status').name, 'git-status');
  assert.equal(findFilter('pytest').name, 'tests');
  assert.equal(findFilter('echo oi'), null);
});
