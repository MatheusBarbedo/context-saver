import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ECON = join(dirname(fileURLToPath(import.meta.url)), '..', 'econ.js');

function runEcon(args, input) {
  return spawnSync('node', [ECON, ...args], { input, encoding: 'utf8' });
}

test('run --b64 executa e propaga exit code', () => {
  const b64 = Buffer.from('exit 4', 'utf8').toString('base64');
  const r = runEcon(['run', '--b64', b64]);
  assert.equal(r.status, 4);
});

test('hook reescreve git status vindo do Claude', () => {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } });
  const r = runEcon(['hook'], input);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /updatedInput/);
  assert.match(r.stdout, /run --shell bash --b64/);
});

test('hook com comando neutro não imprime nada', () => {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'echo oi' } });
  const r = runEcon(['hook'], input);
  assert.equal(r.stdout.trim(), '');
});

test('doctor imprime checklist', () => {
  const r = runEcon(['doctor']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /claude-md/);
});

test('stats imprime relatório de tokens', () => {
  const r = runEcon(['stats']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Tokens:/);
});

test('show sem id sai com erro', () => {
  const r = runEcon(['show']);
  assert.equal(r.status, 1);
});
