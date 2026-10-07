import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const fakeHome = mkdtempSync(join(tmpdir(), 'econ-lazy-dispatch-home-'));
process.env.HOME = fakeHome;
process.env.USERPROFILE = fakeHome;

const { setDefaultMode } = await import('../src/lazy/state.js');
const { dispatchLazyHook } = await import('../src/lazy/dispatch.js');

test('claude session-start devolve o texto cru', () => {
  setDefaultMode('claude', 'full');
  const out = dispatchLazyHook({ agent: 'claude', event: 'session-start', payload: {} });
  assert.ok(out.includes('MODO ECONÔMICO ATIVO'));
});

test('claude subagent-start embrulha em hookSpecificOutput', () => {
  setDefaultMode('claude', 'full');
  dispatchLazyHook({ agent: 'claude', event: 'session-start', payload: {} });
  const out = dispatchLazyHook({ agent: 'claude', event: 'subagent-start', payload: {} });
  const parsed = JSON.parse(out);
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'subagent-start');
  assert.ok(parsed.hookSpecificOutput.additionalContext.includes('MODO ECONÔMICO'));
});

test('copilot só emite additionalContext em session-start', () => {
  setDefaultMode('copilot', 'full');
  const start = JSON.parse(dispatchLazyHook({ agent: 'copilot', event: 'session-start', payload: {} }));
  assert.ok(start.additionalContext.includes('MODO ECONÔMICO'));
  const prompt = JSON.parse(
    dispatchLazyHook({ agent: 'copilot', event: 'prompt-submit', payload: { prompt: '/lazy ultra' } }),
  );
  assert.deepEqual(prompt, {});
});

test('codex embrulha em systemMessage + hookSpecificOutput', () => {
  setDefaultMode('codex', 'full');
  const out = JSON.parse(dispatchLazyHook({ agent: 'codex', event: 'session-start', payload: {} }));
  assert.equal(out.systemMessage, 'MODO ECONÔMICO:FULL');
  assert.equal(out.hookSpecificOutput.hookEventName, 'session-start');
});

test('evento desconhecido lança erro', () => {
  assert.throws(() => dispatchLazyHook({ agent: 'claude', event: 'bogus', payload: {} }));
});
