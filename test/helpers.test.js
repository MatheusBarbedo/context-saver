import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitLines, stripLines, collapseBlankRuns } from '../src/filters/helpers.js';

test('splitLines normaliza CRLF e remove linha final vazia', () => {
  assert.deepEqual(splitLines('a\r\nb\n'), ['a', 'b']);
});

test('stripLines remove linhas que casam o regex', () => {
  const out = stripLines(['keep', '  (use git add)', 'also'], /^\s*\(use /);
  assert.deepEqual(out, ['keep', 'also']);
});

test('collapseBlankRuns colapsa múltiplas linhas em branco em uma', () => {
  assert.deepEqual(collapseBlankRuns(['a', '', '', 'b']), ['a', '', 'b']);
});
