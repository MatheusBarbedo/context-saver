import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teeSave } from '../src/tee.js';
import { readRecovery } from '../src/show.js';

test('readRecovery devolve tudo, intervalo e grep', () => {
  const { id } = teeSave('l1\nl2\nl3\nl4\nl5');
  assert.equal(readRecovery(id), 'l1\nl2\nl3\nl4\nl5');
  assert.equal(readRecovery(id, { lines: '2-3' }), 'l2\nl3');
  assert.equal(readRecovery(id, { grep: 'l4' }), 'l4');
});

test('readRecovery com id inexistente lança', () => {
  assert.throws(() => readRecovery('000-zzzzzz'));
});

test('readRecovery com id inválido lança sem ler fora do tee', () => {
  assert.throws(() => readRecovery('../../etc/passwd'), /inválido/);
});
