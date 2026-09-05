import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens } from '../src/tokens.js';

test('estimateTokens: ~1 token a cada 4 chars', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcde'), 2);
});

test('estimateTokens: entrada nula vira 0', () => {
  assert.equal(estimateTokens(null), 0);
  assert.equal(estimateTokens(undefined), 0);
});
