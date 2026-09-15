import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addClaudeLazyHooks,
  removeClaudeLazyHooks,
  hasClaudeLazyHooks,
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
