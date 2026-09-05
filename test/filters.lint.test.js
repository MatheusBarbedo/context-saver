import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintFilters } from '../src/filters/lint.js';

const f = lintFilters[0];

test('casa tsc/eslint/ruff', () => {
  assert.ok(f.test('npx tsc --noEmit'));
  assert.ok(f.test('eslint .'));
  assert.ok(f.test('ruff check'));
  assert.equal(f.test('git status'), false);
});

test('exit 0 colapsa para linha única de OK', () => {
  const out = f.run({ command: 'eslint .', stdout: 'muitas\nlinhas\nde\nnada', stderr: '', exitCode: 0 });
  assert.match(out, /sem problemas/i);
});

test('exit != 0 mantém linhas com error/warning', () => {
  const raw = ['ok.ts', 'a.ts(3,5): error TS2322: Type X', 'b.ts warning: unused', 'done'].join('\n');
  const out = f.run({ command: 'tsc', stdout: raw, stderr: '', exitCode: 2 });
  assert.match(out, /error TS2322/);
  assert.match(out, /warning: unused/);
  assert.doesNotMatch(out, /^ok\.ts$/m);
});
