import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  installLazyClaude,
  uninstallLazyClaude,
  installLazyCopilot,
  uninstallLazyCopilot,
  installLazyCodex,
  uninstallLazyCodex,
  statusLazyPaths,
} from '../src/lazy/setup.js';

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
