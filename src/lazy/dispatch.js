import { onSessionStart, onPromptSubmit, onSubagentStart } from './hooks.js';

function formatHookOutput(agent, event, { mode, context }) {
  if (agent === 'copilot') {
    if (event === 'session-start' && context) {
      return JSON.stringify({ additionalContext: context });
    }
    return JSON.stringify({});
  }
  if (agent === 'codex') {
    const output = { systemMessage: `MODO ECONÔMICO:${mode.toUpperCase()}` };
    if (context) {
      output.hookSpecificOutput = { hookEventName: event, additionalContext: context };
    }
    return JSON.stringify(output);
  }
  if (event === 'subagent-start') {
    return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } });
  }
  return context;
}

export function dispatchLazyHook({ agent, event, payload }) {
  let result;
  if (event === 'session-start') result = onSessionStart(agent);
  else if (event === 'prompt-submit') result = onPromptSubmit(agent, payload?.prompt);
  else if (event === 'subagent-start') result = onSubagentStart(agent);
  else throw new Error(`evento de hook desconhecido: ${event}`);
  return formatHookOutput(agent, event, result);
}
