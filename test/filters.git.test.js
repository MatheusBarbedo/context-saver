import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gitFilters } from '../src/filters/git.js';

const status = gitFilters.find((f) => f.name === 'git-status');
const log = gitFilters.find((f) => f.name === 'git-log');

test('git-status casa e remove linhas de dica (use ...)', () => {
  assert.ok(status.test('git status'));
  const raw = [
    'On branch main',
    'Changes not staged for commit:',
    '  (use "git add <file>..." to update what will be committed)',
    '  (use "git restore <file>..." to discard changes)',
    '',
    '\tmodified:   src/a.js',
    '',
  ].join('\n');
  const out = status.run({ command: 'git status', stdout: raw, stderr: '', exitCode: 0 });
  assert.doesNotMatch(out, /\(use /);
  assert.match(out, /On branch main/);
  assert.match(out, /modified:   src\/a\.js/);
});

test('git-status não casa git commit', () => {
  assert.equal(status.test('git commit -m x'), false);
});

test('git-log mantém só os primeiros commits e sinaliza o resto', () => {
  assert.ok(log.test('git log'));
  const commits = Array.from({ length: 30 }, (_, i) => `commit ${i}`).join('\n');
  const out = log.run({ command: 'git log', stdout: commits, stderr: '', exitCode: 0 });
  assert.match(out, /commit 0/);
  assert.doesNotMatch(out, /commit 29/);
  assert.match(out, /linhas ocultas/);
});
