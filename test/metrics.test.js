import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { record, aggregate } from '../src/metrics.js';

test('record + aggregate somam por família e total', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-m-'));
  const file = join(dir, 'metrics.jsonl');
  record({ family: 'git-status', bytesBefore: 100, bytesAfter: 40, tokensBefore: 25, tokensAfter: 10, filtered: true }, file);
  record({ family: 'tests', bytesBefore: 200, bytesAfter: 20, tokensBefore: 50, tokensAfter: 5, filtered: true }, file);
  const agg = aggregate(file);
  assert.equal(agg.count, 2);
  assert.equal(agg.totalTokensBefore, 75);
  assert.equal(agg.totalTokensAfter, 15);
  assert.equal(agg.byFamily['tests'].tokensAfter, 5);
  rmSync(dir, { recursive: true, force: true });
});

test('record + aggregate somam por agente', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-ma-'));
  const file = join(dir, 'metrics.jsonl');
  record({ family: 'git-status', agent: 'claude', tokensBefore: 25, tokensAfter: 10, filtered: true }, file);
  record({ family: 'tests', agent: 'copilot', tokensBefore: 50, tokensAfter: 5, filtered: true }, file);
  record({ family: 'tests', agent: 'copilot', tokensBefore: 30, tokensAfter: 5, filtered: true }, file);
  const agg = aggregate(file);
  assert.equal(agg.byAgent['claude'].count, 1);
  assert.equal(agg.byAgent['claude'].tokensBefore, 25);
  assert.equal(agg.byAgent['copilot'].count, 2);
  assert.equal(agg.byAgent['copilot'].tokensBefore, 80);
  rmSync(dir, { recursive: true, force: true });
});

test('aggregate em arquivo inexistente devolve zeros', () => {
  const agg = aggregate(join(tmpdir(), 'nao-existe-econ.jsonl'));
  assert.equal(agg.count, 0);
  assert.equal(agg.totalTokensBefore, 0);
});

test('record nunca lança em caminho inválido', () => {
  assert.doesNotThrow(() => record({ family: 'x' }, '\0:/caminho/invalido'));
});
