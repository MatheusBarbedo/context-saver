import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runChecks, applyFix } from '../src/doctor.js';

test('doctor detecta CLAUDE.md, copilot-instructions e .gitignore ausentes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-doc-'));
  const checks = runChecks({ cwd: dir, home: dir });
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
  assert.equal(byId['claude-md'].ok, false);
  assert.equal(byId['copilot-instructions'].ok, false);
  assert.equal(byId['gitignore'].ok, false);
  rmSync(dir, { recursive: true, force: true });
});

test('applyFix cria .claudeignore e copilot-instructions ausentes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-fix-'));
  const created = applyFix({ cwd: dir });
  assert.equal(created.length, 2);
  assert.ok(existsSync(join(dir, '.claudeignore')));
  assert.ok(existsSync(join(dir, '.github', 'copilot-instructions.md')));
  const again = applyFix({ cwd: dir });
  assert.equal(again.length, 0);
  rmSync(dir, { recursive: true, force: true });
});

test('doctor aprova CLAUDE.md com tamanho adequado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-doc2-'));
  writeFileSync(join(dir, 'CLAUDE.md'), Array.from({ length: 400 }, () => 'palavra').join(' '));
  writeFileSync(join(dir, '.gitignore'), 'node_modules');
  const checks = runChecks({ cwd: dir, home: dir });
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
  assert.equal(byId['claude-md'].ok, true);
  assert.equal(byId['gitignore'].ok, true);
  rmSync(dir, { recursive: true, force: true });
});
