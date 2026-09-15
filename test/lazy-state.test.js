import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  resolveDefaultMode,
  setSessionMode,
  clearSessionMode,
  readSessionMode,
  setDefaultMode,
} = await import('../src/lazy/state.js');

test('resolveDefaultMode cai pra full sem env nem estado', () => {
  delete process.env.ECON_LAZY_MODE;
  assert.equal(resolveDefaultMode('claude'), 'full');
});

test('resolveDefaultMode prioriza a env var', () => {
  process.env.ECON_LAZY_MODE = 'ultra';
  assert.equal(resolveDefaultMode('claude'), 'ultra');
  delete process.env.ECON_LAZY_MODE;
});

test('setDefaultMode persiste e resolveDefaultMode le de volta', () => {
  setDefaultMode('codex', 'lite');
  assert.equal(resolveDefaultMode('codex'), 'lite');
});

test('setSessionMode e readSessionMode nao vazam entre agentes', () => {
  setSessionMode('claude', 'ultra');
  assert.equal(readSessionMode('claude'), 'ultra');
  assert.equal(readSessionMode('copilot'), null);
});

test('clearSessionMode zera so o mode, mantem defaultMode', () => {
  setDefaultMode('claude', 'lite');
  setSessionMode('claude', 'ultra');
  clearSessionMode('claude');
  assert.equal(readSessionMode('claude'), null);
  assert.equal(resolveDefaultMode('claude'), 'lite');
  setDefaultMode('claude', 'full');
  setDefaultMode('codex', 'full');
});
