import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addClaudeHook,
  hasClaudeHook,
  removeClaudeHook,
  buildCopilotConfig,
  addCodexHook,
  hasCodexHook,
  removeCodexHook,
} from '../src/installer.js';

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

test('removeClaudeHook tira o hook do context-saver e mantem os outros', () => {
  let settings = { hooks: { PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'x' }] }] } };
  settings = addClaudeHook(settings, ECON);
  assert.equal(settings.hooks.PreToolUse.length, 2);
  const out = removeClaudeHook(settings);
  assert.equal(hasClaudeHook(out), false);
  assert.equal(out.hooks.PreToolUse.length, 1);
  assert.equal(out.hooks.PreToolUse[0].matcher, 'Write');
});

test('removeClaudeHook em settings sem hooks nao quebra', () => {
  assert.doesNotThrow(() => removeClaudeHook({}));
  assert.doesNotThrow(() => removeClaudeHook(undefined));
});

test('buildCopilotConfig gera preToolUse com o comando do hook', () => {
  const cfg = buildCopilotConfig(ECON);
  assert.equal(cfg.version, 1);
  assert.ok(Array.isArray(cfg.hooks.preToolUse));
  assert.match(cfg.hooks.preToolUse[0].bash, /econ\.js" hook --agent copilot$/);
});

test('addCodexHook injeta hook PreToolUse e é idempotente', () => {
  let config = {};
  config = addCodexHook(config, ECON);
  assert.ok(hasCodexHook(config));
  assert.match(config.hooks.PreToolUse[0].command, /econ\.js" hook --agent codex$/);
  const once = JSON.stringify(config);
  config = addCodexHook(config, ECON);
  assert.equal(JSON.stringify(config), once);
});

test('addCodexHook preserva outras entradas em PreToolUse', () => {
  const config = { hooks: { PreToolUse: [{ command: 'outro-hook.js' }] } };
  const out = addCodexHook(config, ECON);
  assert.equal(out.hooks.PreToolUse.length, 2);
});

test('removeCodexHook tira o hook do context-saver e mantem os outros', () => {
  let config = { hooks: { PreToolUse: [{ command: 'outro-hook.js' }] } };
  config = addCodexHook(config, ECON);
  assert.equal(config.hooks.PreToolUse.length, 2);
  const out = removeCodexHook(config);
  assert.equal(hasCodexHook(out), false);
  assert.equal(out.hooks.PreToolUse.length, 1);
  assert.equal(out.hooks.PreToolUse[0].command, 'outro-hook.js');
});

test('removeCodexHook em config sem hooks nao quebra', () => {
  assert.doesNotThrow(() => removeCodexHook({}));
  assert.doesNotThrow(() => removeCodexHook(undefined));
});
