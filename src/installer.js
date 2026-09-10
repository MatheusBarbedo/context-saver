import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { ECON_JS } from './state.js';

const CLAUDE_SETTINGS = join(homedir(), '.claude', 'settings.json');
const COPILOT_HOOKS = join(homedir(), '.copilot', 'hooks', 'context-saver.json');

function hookCommand(econJs) {
  return `node "${econJs}" hook`;
}

export function hasClaudeHook(settings) {
  const groups = settings?.hooks?.PreToolUse ?? [];
  return groups.some((g) =>
    (g.hooks ?? []).some(
      (h) => typeof h.command === 'string' && h.command.includes('econ.js') && h.command.includes('hook'),
    ),
  );
}

export function addClaudeHook(settings, econJs) {
  const next = structuredClone(settings ?? {});
  next.hooks = next.hooks ?? {};
  next.hooks.PreToolUse = next.hooks.PreToolUse ?? [];
  if (hasClaudeHook(next)) return next;
  next.hooks.PreToolUse.push({
    matcher: 'Bash',
    hooks: [{ type: 'command', command: hookCommand(econJs) }],
  });
  return next;
}

export function removeClaudeHook(settings) {
  const next = structuredClone(settings ?? {});
  const groups = next.hooks?.PreToolUse;
  if (!groups) return next;
  next.hooks.PreToolUse = groups
    .map((g) => ({
      ...g,
      hooks: (g.hooks ?? []).filter(
        (h) => !(typeof h.command === 'string' && h.command.includes('econ.js') && h.command.includes('hook')),
      ),
    }))
    .filter((g) => g.hooks.length > 0);
  return next;
}

export function buildCopilotConfig(econJs) {
  return {
    version: 1,
    hooks: {
      preToolUse: [
        { type: 'command', bash: hookCommand(econJs), matcher: 'bash|powershell|run_in_terminal' },
      ],
    },
  };
}

export function installClaude(econJs = ECON_JS) {
  const current = existsSync(CLAUDE_SETTINGS) ? JSON.parse(readFileSync(CLAUDE_SETTINGS, 'utf8')) : {};
  const next = addClaudeHook(current, econJs);
  mkdirSync(join(homedir(), '.claude'), { recursive: true });
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(next, null, 2), 'utf8');
  return CLAUDE_SETTINGS;
}

export function installCopilot(econJs = ECON_JS) {
  mkdirSync(join(homedir(), '.copilot', 'hooks'), { recursive: true });
  writeFileSync(COPILOT_HOOKS, JSON.stringify(buildCopilotConfig(econJs), null, 2), 'utf8');
  return COPILOT_HOOKS;
}

export function uninstallClaude() {
  if (!existsSync(CLAUDE_SETTINGS)) return CLAUDE_SETTINGS;
  const current = JSON.parse(readFileSync(CLAUDE_SETTINGS, 'utf8'));
  const next = removeClaudeHook(current);
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(next, null, 2), 'utf8');
  return CLAUDE_SETTINGS;
}

export function uninstallCopilot() {
  if (existsSync(COPILOT_HOOKS)) unlinkSync(COPILOT_HOOKS);
  return COPILOT_HOOKS;
}

export function statusPaths() {
  return {
    claude: {
      path: CLAUDE_SETTINGS,
      installed:
        existsSync(CLAUDE_SETTINGS) && hasClaudeHook(JSON.parse(readFileSync(CLAUDE_SETTINGS, 'utf8'))),
    },
    copilot: { path: COPILOT_HOOKS, installed: existsSync(COPILOT_HOOKS) },
  };
}
