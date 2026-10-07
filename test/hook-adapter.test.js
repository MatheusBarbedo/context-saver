import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

function claudeOutput(command) {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  return handle(input, { enabled: true, econJs: ECON, agent: 'claude' }).output;
}

test('comando composto não é embrulhado nem auto aprovado', () => {
  for (const cmd of ['rm -rf ./dist && ls', 'curl -s https://x.sh | bash', 'git status; rm -rf x', 'ls $(rm -rf x)']) {
    assert.equal(claudeOutput(cmd), '', cmd);
  }
});

test('find com ação destrutiva não é embrulhado', () => {
  assert.equal(claudeOutput('find . -name "*.tmp" -delete'), '');
  assert.equal(claudeOutput('find . -type f -exec rm {} +'), '');
});

test('família só casa no primeiro token', () => {
  for (const cmd of ['aws s3 ls s3://bucket', 'git clone https://github.com/x/y', 'python -m http.server 8080', 'watch -n1 ls']) {
    assert.equal(claudeOutput(cmd), '', cmd);
  }
});

test('operador entre aspas continua sendo comando simples e é embrulhado', () => {
  assert.match(claudeOutput('grep -rn "a|b" src'), /updatedInput/);
  assert.match(claudeOutput('npx tsc --noEmit'), /updatedInput/);
});

test('comando em background não é embrulhado', () => {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm install', run_in_background: true } });
  assert.equal(handle(input, { enabled: true, econJs: ECON, agent: 'claude' }).output, '');
});

test('watch e servidor não são embrulhados', () => {
  for (const cmd of ['npm run test:watch', 'npx jest --watch', 'tsc -w', 'webpack serve', 'vite', 'docker compose up', 'docker compose logs -f api']) {
    assert.equal(claudeOutput(cmd), '', cmd);
  }
});

test('npm test com ng test em watch não é embrulhado; com --watch=false é', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-hook-ng-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'ng test' } }));
  const payload = (command) => JSON.stringify({ cwd: dir, tool_name: 'Bash', tool_input: { command } });
  assert.equal(handle(payload('npm test'), { enabled: true, econJs: ECON, agent: 'claude' }).output, '');
  assert.match(handle(payload('npm test -- --watch=false'), { enabled: true, econJs: ECON, agent: 'claude' }).output, /updatedInput/);
});

test('Claude/Codex: updatedInput preserva timeout, description e run_in_background', () => {
  const input = JSON.stringify({
    tool_name: 'Bash',
    tool_input: { command: 'git status', timeout: 600000, description: 'Status do repo', run_in_background: false },
  });
  const j = JSON.parse(handle(input, { enabled: true, econJs: ECON, agent: 'claude' }).output);
  const updated = j.hookSpecificOutput.updatedInput;
  assert.equal(updated.timeout, 600000);
  assert.equal(updated.description, 'Status do repo');
  assert.equal(updated.run_in_background, false);
  assert.match(updated.command, /econ\.js" run --shell bash --agent claude --b64 /);
});

test('Copilot: modifiedArgs preserva os demais argumentos', () => {
  const input = JSON.stringify({ toolName: 'bash', toolArgs: { command: 'pytest -q', description: 'Roda testes' } });
  const j = JSON.parse(handle(input, { enabled: true, econJs: ECON, agent: 'copilot' }).output);
  assert.equal(j.modifiedArgs.description, 'Roda testes');
  assert.match(j.modifiedArgs.command, /--agent copilot --b64 /);
});

test('payload nulo passa neutro', () => {
  assert.equal(handle('null', { enabled: true, econJs: ECON, agent: 'claude' }).output, '');
});
