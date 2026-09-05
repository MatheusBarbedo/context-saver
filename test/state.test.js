import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECON_JS, isEnabled, setEnabled } from '../src/state.js';

test('ECON_JS aponta para econ.js na raiz do projeto', () => {
  assert.match(ECON_JS, /econ\.js$/);
});

test('setEnabled(false) desliga e setEnabled(true) religa', () => {
  setEnabled(false);
  assert.equal(isEnabled(), false);
  setEnabled(true);
  assert.equal(isEnabled(), true);
});
