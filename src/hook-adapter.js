import { findFilter } from './filters/index.js';
import { ECON_JS } from './state.js';

function extractCommand(j) {
  if (j.tool_input && typeof j.tool_input.command === 'string') {
    return { command: j.tool_input.command, tool: j.tool_name };
  }
  if (j.toolArgs && typeof j.toolArgs.command === 'string') {
    return { command: j.toolArgs.command, tool: j.toolName };
  }
  return { command: null, tool: null };
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

function wrap(command, econJs, shell, agent) {
  const b64 = Buffer.from(command, 'utf8').toString('base64');
  const shellArg = shell ? `--shell ${shell} ` : '';
  const agentArg = agent ? `--agent ${agent} ` : '';
  return `node "${econJs}" run ${shellArg}${agentArg}--b64 ${b64}`;
}

function rewriteNested(wrapped) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'context-saver: saída comprimida',
      updatedInput: { command: wrapped },
    },
  });
}

function rewriteFlat(wrapped) {
  return JSON.stringify({
    permissionDecision: 'allow',
    permissionDecisionReason: 'context-saver: saída comprimida',
    modifiedArgs: { command: wrapped },
  });
}

export function handle(inputString, { enabled = true, econJs = ECON_JS, agent = 'unknown' } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(inputString);
  } catch {
    return neutral();
  }
  if (!enabled) return neutral();

  const { command, tool } = extractCommand(parsed);
  if (!command) return neutral();
  if (command.includes('econ.js')) return neutral();
  if (!findFilter(command)) return neutral();

  const wrapped = wrap(command, econJs, shellFor(tool), agent);
  const output = agent === 'copilot' ? rewriteFlat(wrapped) : rewriteNested(wrapped);
  return { output, exitCode: 0 };
}
