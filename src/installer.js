import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { ECON_JS } from './state.js';

const CLAUDE_SETTINGS = join(homedir(), '.claude', 'settings.json');
const COPILOT_HOOKS = join(homedir(), '.copilot', 'hooks', 'context-saver.json');
const CODEX_HOOKS = join(homedir(), '.codex', 'hooks.json');

function hookCommand(econJs, agent) {
  return `node "${econJs}" hook --agent ${agent}`;
}

function isEconEntry(h) {
  return typeof h?.command === 'string' && h.command.includes('econ.js') && h.command.includes('hook');
}

export function hasClaudeHook(settings) {
  const groups = settings?.hooks?.PreToolUse ?? [];
  return groups.some((g) => (g.hooks ?? []).some(isEconEntry));
}

export function removeClaudeHook(settings) {
  const next = structuredClone(settings ?? {});
  const groups = next.hooks?.PreToolUse;
  if (!groups) return next;
  next.hooks.PreToolUse = groups
    .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !isEconEntry(h)) }))
    .filter((g) => g.hooks.length > 0);
  return next;
}

export function addClaudeHook(settings, econJs) {
  const next = removeClaudeHook(settings ?? {});
  next.hooks = next.hooks ?? {};
  next.hooks.PreToolUse = next.hooks.PreToolUse ?? [];
  next.hooks.PreToolUse.push({
    matcher: 'Bash',
    hooks: [{ type: 'command', command: hookCommand(econJs, 'claude') }],
  });
  return next;
}

export function buildCopilotConfig(econJs) {
  return {
    version: 1,
    hooks: {
      preToolUse: [
        { type: 'command', bash: hookCommand(econJs, 'copilot'), matcher: 'bash|powershell|run_in_terminal' },
      ],
    },
  };
}

export function hasCodexHook(config) {
  const list = config?.hooks?.PreToolUse ?? [];
  return list.some(isEconEntry);
}

export function removeCodexHook(config) {
  const next = structuredClone(config ?? {});
  if (!next.hooks?.PreToolUse) return next;
  next.hooks.PreToolUse = next.hooks.PreToolUse.filter((h) => !isEconEntry(h));
  return next;
}

export function addCodexHook(config, econJs) {
  const next = removeCodexHook(config ?? {});
  next.hooks = next.hooks ?? {};
  next.hooks.PreToolUse = next.hooks.PreToolUse ?? [];
  next.hooks.PreToolUse.push({ command: hookCommand(econJs, 'codex') });
  return next;
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

export function installCodex(econJs = ECON_JS) {
  const current = existsSync(CODEX_HOOKS) ? JSON.parse(readFileSync(CODEX_HOOKS, 'utf8')) : {};
  const next = addCodexHook(current, econJs);
  mkdirSync(join(homedir(), '.codex'), { recursive: true });
  writeFileSync(CODEX_HOOKS, JSON.stringify(next, null, 2), 'utf8');
  return CODEX_HOOKS;
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

export function uninstallCodex() {
  if (!existsSync(CODEX_HOOKS)) return CODEX_HOOKS;
  const current = JSON.parse(readFileSync(CODEX_HOOKS, 'utf8'));
  const next = removeCodexHook(current);
  writeFileSync(CODEX_HOOKS, JSON.stringify(next, null, 2), 'utf8');
  return CODEX_HOOKS;
}

export function statusPaths() {
  return {
    claude: {
      path: CLAUDE_SETTINGS,
      installed:
        existsSync(CLAUDE_SETTINGS) && hasClaudeHook(JSON.parse(readFileSync(CLAUDE_SETTINGS, 'utf8'))),
    },
    copilot: { path: COPILOT_HOOKS, installed: existsSync(COPILOT_HOOKS) },
    codex: {
      path: CODEX_HOOKS,
      installed: existsSync(CODEX_HOOKS) && hasCodexHook(JSON.parse(readFileSync(CODEX_HOOKS, 'utf8'))),
    },
  };
}
