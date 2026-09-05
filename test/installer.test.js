import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addClaudeHook, hasClaudeHook, buildCopilotConfig } from '../src/installer.js';

const ECON = 'C:\\econ\\econ.js';

test('addClaudeHook injeta hook PreToolUse/Bash e é idempotente', () => {
  let settings = {};
  settings = addClaudeHook(settings, ECON);
  assert.ok(hasClaudeHook(settings));
  const once = JSON.stringify(settings);
  settings = addClaudeHook(settings, ECON);
  assert.equal(JSON.stringify(settings), once);
});

test('addClaudeHook preserva hooks existentes', () => {
  const settings = { hooks: { PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'x' }] }] } };
  const out = addClaudeHook(settings, ECON);
  assert.equal(out.hooks.PreToolUse.length, 2);
});

test('buildCopilotConfig gera preToolUse com o comando do hook', () => {
  const cfg = buildCopilotConfig(ECON);
  assert.equal(cfg.version, 1);
  assert.ok(Array.isArray(cfg.hooks.preToolUse));
  assert.match(cfg.hooks.preToolUse[0].bash, /econ\.js" hook$/);
});
