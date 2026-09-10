import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../src/hook-adapter.js';

const ECON = 'C:\\econ\\econ.js';

test('Claude: comando-alvo é reescrito via updatedInput', () => {
  const input = JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'git status' },
  });
  const { output } = handle(input, { enabled: true, econJs: ECON, agent: 'claude' });
  const j = JSON.parse(output);
  assert.equal(j.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(j.hookSpecificOutput.updatedInput.command, /econ\.js" run --shell bash --agent claude --b64 /);
});

test('Codex: mesma forma de payload do Claude, reescrito via updatedInput', () => {
  const input = JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'pytest -q' },
    tool_use_id: 'call_123',
  });
  const { output } = handle(input, { enabled: true, econJs: ECON, agent: 'codex' });
  const j = JSON.parse(output);
  assert.equal(j.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(j.hookSpecificOutput.updatedInput.command, /econ\.js" run --shell bash --agent codex --b64 /);
});

test('Copilot: comando-alvo é reescrito via modifiedArgs', () => {
  const input = JSON.stringify({
    toolName: 'bash',
    toolArgs: { command: 'pytest -q' },
  });
  const { output } = handle(input, { enabled: true, econJs: ECON, agent: 'copilot' });
  const j = JSON.parse(output);
  assert.equal(j.permissionDecision, 'allow');
  assert.match(j.modifiedArgs.command, /econ\.js" run --shell bash --agent copilot --b64 /);
});

test('Copilot powershell: comando reescrito usa --shell powershell', () => {
  const input = JSON.stringify({
    toolName: 'powershell',
    toolArgs: { command: 'Get-ChildItem C:\\Windows' },
  });
  const { output } = handle(input, { enabled: true, econJs: ECON, agent: 'copilot' });
  const j = JSON.parse(output);
  assert.match(j.modifiedArgs.command, /econ\.js" run --shell powershell --agent copilot --b64 /);
});

test('comando fora do alvo passa neutro (output vazio)', () => {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'echo oi' } });
  assert.equal(handle(input, { enabled: true, econJs: ECON, agent: 'claude' }).output, '');
});

test('anti-loop: comando já embrulhado passa neutro', () => {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'node "x/econ.js" run --b64 Z2l0' } });
  assert.equal(handle(input, { enabled: true, econJs: ECON, agent: 'claude' }).output, '');
});

test('desligado: nada é reescrito', () => {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } });
  assert.equal(handle(input, { enabled: false, econJs: ECON, agent: 'claude' }).output, '');
});

test('JSON inválido não quebra (neutro)', () => {
  assert.equal(handle('not json', { enabled: true, econJs: ECON, agent: 'claude' }).output, '');
});

test('payload sem forma reconhecida passa neutro, mesmo com agente informado', () => {
  const input = JSON.stringify({ algumCampo: 'x' });
  assert.equal(handle(input, { enabled: true, econJs: ECON, agent: 'codex' }).output, '');
});

test('base64 embutido decodifica para o comando original', () => {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } });
  const j = JSON.parse(handle(input, { enabled: true, econJs: ECON, agent: 'claude' }).output);
  const b64 = j.hookSpecificOutput.updatedInput.command.match(/--b64 (\S+)/)[1];
  assert.equal(Buffer.from(b64, 'base64').toString('utf8'), 'git status');
});
