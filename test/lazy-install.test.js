import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  addClaudeLazyHooks,
  removeClaudeLazyHooks,
  hasClaudeLazyHooks,
  addCodexLazyHooks,
  removeCodexLazyHooks,
  hasCodexLazyHooks,
  buildCopilotLazyConfig,
  installLazyClaude,
  uninstallLazyClaude,
  installLazyCopilot,
  uninstallLazyCopilot,
  installLazyCodex,
  uninstallLazyCodex,
  statusLazyPaths,
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

test('installLazyClaude escreve hooks, statusline e copia as 6 skills', () => {
  const home = mkdtempSync(join(tmpdir(), 'econ-lazy-home-'));
  const path = installLazyClaude('/x/econ.js', { home });
  const settings = JSON.parse(readFileSync(path, 'utf8'));
  assert.ok(settings.hooks.SessionStart);
  assert.ok(settings.statusLine);
  for (const name of ['econ-lazy', 'econ-lazy-review', 'econ-lazy-audit', 'econ-lazy-debt', 'econ-lazy-gain', 'econ-lazy-help']) {
    assert.ok(existsSync(join(home, '.claude', 'skills', name, 'SKILL.md')), name);
  }
});

test('installLazyClaude não sobrescreve uma statusLine já existente', () => {
  const home = mkdtempSync(join(tmpdir(), 'econ-lazy-home-'));
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(
    join(home, '.claude', 'settings.json'),
    JSON.stringify({ statusLine: { type: 'command', command: 'custom' } }),
    'utf8',
  );
  installLazyClaude('/x/econ.js', { home });
  const settings = JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'));
  assert.equal(settings.statusLine.command, 'custom');
});

test('uninstallLazyClaude com --purge remove as skills, sem purge mantém', () => {
  const home = mkdtempSync(join(tmpdir(), 'econ-lazy-home-'));
  installLazyClaude('/x/econ.js', { home });
  uninstallLazyClaude({ home, purge: false });
  assert.ok(existsSync(join(home, '.claude', 'skills', 'econ-lazy', 'SKILL.md')));
  uninstallLazyClaude({ home, purge: true });
  assert.ok(!existsSync(join(home, '.claude', 'skills', 'econ-lazy')));
});

test('installLazyCopilot e uninstallLazyCopilot', () => {
  const home = mkdtempSync(join(tmpdir(), 'econ-lazy-home-'));
  const path = installLazyCopilot('/x/econ.js', { home });
  assert.ok(existsSync(path));
  uninstallLazyCopilot({ home });
  assert.ok(!existsSync(path));
});

test('installLazyCodex e uninstallLazyCodex', () => {
  const home = mkdtempSync(join(tmpdir(), 'econ-lazy-home-'));
  const path = installLazyCodex('/x/econ.js', { home });
  const config = JSON.parse(readFileSync(path, 'utf8'));
  assert.ok(config.hooks.SessionStart);
  uninstallLazyCodex({ home });
  const after = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(after.hooks.SessionStart.length, 0);
});

test('statusLazyPaths reporta os 3 agentes', () => {
  const home = mkdtempSync(join(tmpdir(), 'econ-lazy-home-'));
  installLazyClaude('/x/econ.js', { home });
  const status = statusLazyPaths({ home });
  assert.equal(status.claude.installed, true);
  assert.equal(status.claude.skills, true);
  assert.equal(status.copilot.installed, false);
  assert.equal(status.codex.installed, false);
});
