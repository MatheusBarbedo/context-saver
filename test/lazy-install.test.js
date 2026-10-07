import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addClaudeLazyHooks,
  removeClaudeLazyHooks,
  hasClaudeLazyHooks,
  addCodexLazyHooks,
  removeCodexLazyHooks,
  hasCodexLazyHooks,
  buildCopilotLazyConfig,
} from '../src/lazy/install.js';

test('addClaudeLazyHooks adiciona os 3 eventos', () => {
  const next = addClaudeLazyHooks({}, '/x/econ.js');
  assert.equal(next.hooks.SessionStart.length, 1);
  assert.equal(next.hooks.UserPromptSubmit.length, 1);
  assert.equal(next.hooks.SubagentStart.length, 1);
  assert.ok(next.hooks.SessionStart[0].hooks[0].command.includes('lazy-hook'));
});

test('addClaudeLazyHooks é idempotente (não duplica)', () => {
  let next = addClaudeLazyHooks({}, '/x/econ.js');
  next = addClaudeLazyHooks(next, '/x/econ.js');
  assert.equal(next.hooks.SessionStart.length, 1);
});

test('addClaudeLazyHooks preserva o hook de PreToolUse já existente', () => {
  const withPreToolUse = {
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node x hook --agent claude' }] }] },
  };
  const next = addClaudeLazyHooks(withPreToolUse, '/x/econ.js');
  assert.equal(next.hooks.PreToolUse.length, 1);
  assert.equal(next.hooks.SessionStart.length, 1);
});

test('hasClaudeLazyHooks detecta instalação', () => {
  assert.equal(hasClaudeLazyHooks({}), false);
  const next = addClaudeLazyHooks({}, '/x/econ.js');
  assert.equal(hasClaudeLazyHooks(next), true);
});

test('removeClaudeLazyHooks tira só os hooks lazy, mantém PreToolUse', () => {
  const withBoth = addClaudeLazyHooks(
    { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node x hook --agent claude' }] }] } },
    '/x/econ.js',
  );
  const next = removeClaudeLazyHooks(withBoth);
  assert.equal(hasClaudeLazyHooks(next), false);
  assert.equal(next.hooks.PreToolUse.length, 1);
});

test('addCodexLazyHooks adiciona os 3 eventos', () => {
  const next = addCodexLazyHooks({}, '/x/econ.js');
  assert.equal(next.hooks.SessionStart.length, 1);
  assert.equal(next.hooks.UserPromptSubmit.length, 1);
  assert.equal(next.hooks.SubagentStart.length, 1);
  assert.ok(next.hooks.SessionStart[0].command.includes('lazy-hook'));
});

test('addCodexLazyHooks é idempotente', () => {
  let next = addCodexLazyHooks({}, '/x/econ.js');
  next = addCodexLazyHooks(next, '/x/econ.js');
  assert.equal(next.hooks.SessionStart.length, 1);
});

test('addCodexLazyHooks preserva PreToolUse existente', () => {
  const withPreToolUse = { hooks: { PreToolUse: [{ command: 'node x hook --agent codex' }] } };
  const next = addCodexLazyHooks(withPreToolUse, '/x/econ.js');
  assert.equal(next.hooks.PreToolUse.length, 1);
});

test('removeCodexLazyHooks tira só os hooks lazy', () => {
  const withBoth = addCodexLazyHooks({ hooks: { PreToolUse: [{ command: 'node x hook --agent codex' }] } }, '/x/econ.js');
  const next = removeCodexLazyHooks(withBoth);
  assert.equal(hasCodexLazyHooks(next), false);
  assert.equal(next.hooks.PreToolUse.length, 1);
});

test('buildCopilotLazyConfig registra sessionStart e userPromptSubmitted, sem subagent', () => {
  const cfg = buildCopilotLazyConfig('/x/econ.js');
  assert.ok(cfg.hooks.sessionStart[0].bash.includes('lazy-hook'));
  assert.ok(cfg.hooks.userPromptSubmitted[0].bash.includes('lazy-hook'));
  assert.equal(cfg.hooks.subagentStart, undefined);
});
