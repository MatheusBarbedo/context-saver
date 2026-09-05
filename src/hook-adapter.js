import { findFilter } from './filters/index.js';
import { ECON_JS } from './state.js';

function parse(inputString) {
  const j = JSON.parse(inputString);
  if (j.tool_input && typeof j.tool_input.command === 'string') {
    return { agent: 'claude', command: j.tool_input.command, tool: j.tool_name };
  }
  if (j.toolArgs && typeof j.toolArgs.command === 'string') {
    return { agent: 'copilot', command: j.toolArgs.command, tool: j.toolName };
  }
  return { agent: 'unknown', command: null, tool: null };
}

function shellFor(tool) {
  const t = String(tool || '').toLowerCase();
  if (t === 'bash') return 'bash';
  if (t === 'powershell' || t === 'pwsh') return 'powershell';
  return null;
}

function neutral() {
  return { output: '', exitCode: 0 };
}

function wrap(command, econJs, shell) {
  const b64 = Buffer.from(command, 'utf8').toString('base64');
  const shellArg = shell ? `--shell ${shell} ` : '';
  return `node "${econJs}" run ${shellArg}--b64 ${b64}`;
}

function rewriteClaude(wrapped) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'context-saver: saída comprimida',
      updatedInput: { command: wrapped },
    },
  });
}

function rewriteCopilot(wrapped) {
  return JSON.stringify({
    permissionDecision: 'allow',
    permissionDecisionReason: 'context-saver: saída comprimida',
    modifiedArgs: { command: wrapped },
  });
}

export function handle(inputString, { enabled = true, econJs = ECON_JS } = {}) {
  let parsed;
  try {
    parsed = parse(inputString);
  } catch {
    return neutral();
  }
  const { agent, command, tool } = parsed;
  if (agent === 'unknown' || !command) return neutral();
  if (!enabled) return neutral();
  if (command.includes('econ.js')) return neutral();
  if (!findFilter(command)) return neutral();

  const wrapped = wrap(command, econJs, shellFor(tool));
  const output = agent === 'claude' ? rewriteClaude(wrapped) : rewriteCopilot(wrapped);
  return { output, exitCode: 0 };
}
