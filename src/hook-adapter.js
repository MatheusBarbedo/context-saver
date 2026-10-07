import { findFilter } from './filters/index.js';
import { ECON_JS } from './state.js';
import { isSimpleCommand, hasFindAction, isLongRunning } from './guard.js';

function extractCall(j) {
  if (j && j.tool_input && typeof j.tool_input.command === 'string') {
    return { args: j.tool_input, tool: j.tool_name };
  }
  if (j && j.toolArgs && typeof j.toolArgs.command === 'string') {
    return { args: j.toolArgs, tool: j.toolName };
  }
  return { args: null, tool: null };
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

function rewriteNested(input) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'context-saver: saída comprimida',
      updatedInput: input,
    },
  });
}

function rewriteFlat(input) {
  return JSON.stringify({
    permissionDecision: 'allow',
    permissionDecisionReason: 'context-saver: saída comprimida',
    modifiedArgs: input,
  });
}

function shouldWrap(args, cwd) {
  const { command } = args;
  if (command.includes('econ.js') || args.run_in_background === true) return false;
  if (!isSimpleCommand(command) || hasFindAction(command)) return false;
  return Boolean(findFilter(command)) && !isLongRunning(command, { cwd });
}

export function handle(inputString, { enabled = true, econJs = ECON_JS, agent = 'unknown' } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(inputString);
  } catch {
    return neutral();
  }
  if (!enabled) return neutral();

  const { args, tool } = extractCall(parsed);
  if (!args) return neutral();
  const cwd = typeof parsed.cwd === 'string' ? parsed.cwd : undefined;
  if (!shouldWrap(args, cwd)) return neutral();

  const updated = { ...args, command: wrap(args.command, econJs, shellFor(tool), agent) };
  const output = agent === 'copilot' ? rewriteFlat(updated) : rewriteNested(updated);
  return { output, exitCode: 0 };
}
