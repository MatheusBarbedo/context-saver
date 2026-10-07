import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/hook-adapter.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const ECON = '/opt/econ/econ.js';
const EMPTY_CWD = mkdtempSync(join(tmpdir(), 'econ-contract-'));

function load(name, overrides = {}) {
  return { ...JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')), cwd: EMPTY_CWD, ...overrides };
}

function decode(wrapped) {
  return Buffer.from(wrapped.match(/--b64 (\S+)$/)[1], 'base64').toString('utf8');
}

function run(payload, agent) {
  return handle(JSON.stringify(payload), { enabled: true, econJs: ECON, agent }).output;
}

for (const [agent, fixture] of [
  ['claude', 'claude-pretooluse-bash.json'],
  ['codex', 'codex-pretooluse-bash.json'],
]) {
  test(`${agent}: payload documentado gera hookSpecificOutput de PreToolUse com updatedInput completo`, () => {
    const payload = load(fixture);
    const j = JSON.parse(run(payload, agent));
    const out = j.hookSpecificOutput;
    assert.equal(out.hookEventName, 'PreToolUse');
    assert.equal(out.permissionDecision, 'allow');
    assert.equal(typeof out.updatedInput.command, 'string');
    assert.equal(decode(out.updatedInput.command), payload.tool_input.command);
    for (const key of Object.keys(payload.tool_input).filter((k) => k !== 'command')) {
      assert.deepEqual(out.updatedInput[key], payload.tool_input[key], key);
    }
  });

  test(`${agent}: payload documentado com comando composto não recebe decisão`, () => {
    const payload = load(fixture);
    payload.tool_input = { ...payload.tool_input, command: `${payload.tool_input.command} && rm -rf build` };
    assert.equal(run(payload, agent), '');
  });
}

test('copilot: payload documentado gera permissionDecision e modifiedArgs completos no topo', () => {
  const payload = load('copilot-pretooluse-bash.json');
  const j = JSON.parse(run(payload, 'copilot'));
  assert.equal(j.hookSpecificOutput, undefined);
  assert.equal(j.permissionDecision, 'allow');
  assert.equal(decode(j.modifiedArgs.command), payload.toolArgs.command);
  assert.equal(j.modifiedArgs.description, payload.toolArgs.description);
});

test('copilot: payload documentado com comando composto não recebe decisão', () => {
  const payload = load('copilot-pretooluse-bash.json');
  payload.toolArgs = { ...payload.toolArgs, command: 'git status; rm -rf build' };
  assert.equal(run(payload, 'copilot'), '');
});
