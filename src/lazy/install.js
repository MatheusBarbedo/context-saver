import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_SRC = join(__dirname, '..', '..', 'skills');
const SKILL_NAMES = [
  'econ-lazy',
  'econ-lazy-review',
  'econ-lazy-audit',
  'econ-lazy-debt',
  'econ-lazy-gain',
  'econ-lazy-help',
];

function lazyHookCommand(econJs, agent, event) {
  return `node "${econJs}" lazy-hook --agent ${agent} --event ${event}`;
}

function isLazyEntry(h) {
  return typeof h?.command === 'string' && h.command.includes('lazy-hook');
}

export function removeClaudeLazyHooks(settings) {
  const next = structuredClone(settings ?? {});
  for (const event of ['SessionStart', 'UserPromptSubmit', 'SubagentStart']) {
    const groups = next.hooks?.[event];
    if (!groups) continue;
    next.hooks[event] = groups
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !isLazyEntry(h)) }))
      .filter((g) => g.hooks.length > 0);
  }
  return next;
}

export function addClaudeLazyHooks(settings, econJs) {
  const next = removeClaudeLazyHooks(settings ?? {});
  next.hooks = next.hooks ?? {};
  next.hooks.SessionStart = next.hooks.SessionStart ?? [];
  next.hooks.SessionStart.push({
    matcher: 'startup|resume|clear|compact',
    hooks: [{ type: 'command', command: lazyHookCommand(econJs, 'claude', 'session-start') }],
  });
  next.hooks.UserPromptSubmit = next.hooks.UserPromptSubmit ?? [];
  next.hooks.UserPromptSubmit.push({
    hooks: [{ type: 'command', command: lazyHookCommand(econJs, 'claude', 'prompt-submit') }],
  });
  next.hooks.SubagentStart = next.hooks.SubagentStart ?? [];
  next.hooks.SubagentStart.push({
    hooks: [{ type: 'command', command: lazyHookCommand(econJs, 'claude', 'subagent-start') }],
  });
  return next;
}

export function hasClaudeLazyHooks(settings) {
  const groups = settings?.hooks?.SessionStart ?? [];
  return groups.some((g) => (g.hooks ?? []).some(isLazyEntry));
}

const LAZY_EVENTS = [
  ['SessionStart', 'session-start'],
  ['UserPromptSubmit', 'prompt-submit'],
  ['SubagentStart', 'subagent-start'],
];

export function removeCodexLazyHooks(config) {
  const next = structuredClone(config ?? {});
  for (const [event] of LAZY_EVENTS) {
    if (!next.hooks?.[event]) continue;
    next.hooks[event] = next.hooks[event].filter((h) => !isLazyEntry(h));
  }
  return next;
}

export function addCodexLazyHooks(config, econJs) {
  const next = removeCodexLazyHooks(config ?? {});
  next.hooks = next.hooks ?? {};
  for (const [event, name] of LAZY_EVENTS) {
    next.hooks[event] = next.hooks[event] ?? [];
    next.hooks[event].push({ command: lazyHookCommand(econJs, 'codex', name) });
  }
  return next;
}

export function hasCodexLazyHooks(config) {
  const list = config?.hooks?.SessionStart ?? [];
  return list.some(isLazyEntry);
}

export function buildCopilotLazyConfig(econJs) {
  return {
    version: 1,
    hooks: {
      sessionStart: [
        {
          type: 'command',
          bash: lazyHookCommand(econJs, 'copilot', 'session-start'),
          powershell: lazyHookCommand(econJs, 'copilot', 'session-start'),
          timeoutSec: 5,
        },
      ],
      userPromptSubmitted: [
        {
          type: 'command',
          bash: lazyHookCommand(econJs, 'copilot', 'prompt-submit'),
          powershell: lazyHookCommand(econJs, 'copilot', 'prompt-submit'),
          timeoutSec: 5,
        },
      ],
    },
  };
}

function claudeSettingsPath(home) {
  return join(home, '.claude', 'settings.json');
}
function claudeSkillsDir(home) {
  return join(home, '.claude', 'skills');
}
function copilotLazyPath(home) {
  return join(home, '.copilot', 'hooks', 'context-saver-lazy.json');
}
function codexHooksPath(home) {
  return join(home, '.codex', 'hooks.json');
}

function statuslineCommand() {
  const isWin = process.platform === 'win32';
  const script = join(__dirname, isWin ? 'statusline.ps1' : 'statusline.sh');
  return isWin ? `powershell -ExecutionPolicy Bypass -File "${script}"` : `bash "${script}"`;
}

function installSkills(home) {
  const dir = claudeSkillsDir(home);
  for (const name of SKILL_NAMES) {
    const dest = join(dir, name);
    mkdirSync(dest, { recursive: true });
    cpSync(join(SKILLS_SRC, name, 'SKILL.md'), join(dest, 'SKILL.md'));
  }
}

function removeSkills(home) {
  for (const name of SKILL_NAMES) {
    rmSync(join(claudeSkillsDir(home), name), { recursive: true, force: true });
  }
}

function hasAnySkill(home) {
  return SKILL_NAMES.every((n) => existsSync(join(claudeSkillsDir(home), n, 'SKILL.md')));
}

export function installLazyClaude(econJs, { home = homedir() } = {}) {
  const path = claudeSettingsPath(home);
  const current = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const next = addClaudeLazyHooks(current, econJs);
  if (!next.statusLine) next.statusLine = { type: 'command', command: statuslineCommand() };
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2), 'utf8');
  installSkills(home);
  return path;
}

export function uninstallLazyClaude({ home = homedir(), purge = false } = {}) {
  const path = claudeSettingsPath(home);
  if (existsSync(path)) {
    const current = JSON.parse(readFileSync(path, 'utf8'));
    writeFileSync(path, JSON.stringify(removeClaudeLazyHooks(current), null, 2), 'utf8');
  }
  if (purge) removeSkills(home);
  return path;
}

export function installLazyCopilot(econJs, { home = homedir() } = {}) {
  const path = copilotLazyPath(home);
  mkdirSync(join(home, '.copilot', 'hooks'), { recursive: true });
  writeFileSync(path, JSON.stringify(buildCopilotLazyConfig(econJs), null, 2), 'utf8');
  return path;
}

export function uninstallLazyCopilot({ home = homedir() } = {}) {
  const path = copilotLazyPath(home);
  if (existsSync(path)) rmSync(path, { force: true });
  return path;
}

export function installLazyCodex(econJs, { home = homedir() } = {}) {
  const path = codexHooksPath(home);
  const current = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const next = addCodexLazyHooks(current, econJs);
  mkdirSync(join(home, '.codex'), { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2), 'utf8');
  return path;
}

export function uninstallLazyCodex({ home = homedir() } = {}) {
  const path = codexHooksPath(home);
  if (existsSync(path)) {
    const current = JSON.parse(readFileSync(path, 'utf8'));
    writeFileSync(path, JSON.stringify(removeCodexLazyHooks(current), null, 2), 'utf8');
  }
  return path;
}

export function statusLazyPaths({ home = homedir() } = {}) {
  const claudePath = claudeSettingsPath(home);
  const copilotPath = copilotLazyPath(home);
  const codexPath = codexHooksPath(home);
  return {
    claude: {
      path: claudePath,
      installed: existsSync(claudePath) && hasClaudeLazyHooks(JSON.parse(readFileSync(claudePath, 'utf8'))),
      skills: hasAnySkill(home),
    },
    copilot: { path: copilotPath, installed: existsSync(copilotPath) },
    codex: {
      path: codexPath,
      installed: existsSync(codexPath) && hasCodexLazyHooks(JSON.parse(readFileSync(codexPath, 'utf8'))),
    },
  };
}
