import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ECON_JS, isEnabled, setEnabled, purgeData } from '../src/state.js';

test('ECON_JS aponta para econ.js na raiz do projeto', () => {
  assert.match(ECON_JS, /econ\.js$/);
});

test('setEnabled(false) desliga e setEnabled(true) religa', () => {
  setEnabled(false);
  assert.equal(isEnabled(), false);
  setEnabled(true);
  assert.equal(isEnabled(), true);
});

test('purgeData apaga o diretorio informado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-purge-'));
  writeFileSync(join(dir, 'metrics.jsonl'), 'x', 'utf8');
  assert.ok(existsSync(dir));
  purgeData(dir);
  assert.equal(existsSync(dir), false);
});

test('purgeData em diretorio inexistente nao lanca', () => {
  assert.doesNotThrow(() => purgeData(join(tmpdir(), 'econ-purge-nao-existe')));
});
