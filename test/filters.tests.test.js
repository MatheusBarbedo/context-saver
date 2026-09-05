import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testFilters } from '../src/filters/tests.js';

const f = testFilters[0];

test('casa comandos de teste comuns', () => {
  assert.ok(f.test('npm test'));
  assert.ok(f.test('npx jest'));
  assert.ok(f.test('pytest -q'));
  assert.equal(f.test('git status'), false);
});

test('sucesso (exit 0) colapsa para o resumo', () => {
  const raw = ['...........', 'Ran 11 tests', 'OK', '11 passed in 0.5s'].join('\n');
  const out = f.run({ command: 'pytest', stdout: raw, stderr: '', exitCode: 0 });
  assert.match(out, /passed/);
  assert.doesNotMatch(out, /\.\.\.\.\.\.\.\.\.\.\./);
});

test('falha (exit != 0) mantém as linhas de falha', () => {
  const raw = [
    'test_a PASSED',
    'test_b FAILED',
    'E   AssertionError: 1 != 2',
    '1 failed, 1 passed',
  ].join('\n');
  const out = f.run({ command: 'pytest', stdout: raw, stderr: '', exitCode: 1 });
  assert.match(out, /FAILED/);
  assert.match(out, /AssertionError/);
  assert.match(out, /1 failed/);
});
