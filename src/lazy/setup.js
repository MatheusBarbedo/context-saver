import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import {
  addClaudeLazyHooks,
  removeClaudeLazyHooks,
  hasClaudeLazyHooks,
  buildCopilotLazyConfig,
  addCodexLazyHooks,
  removeCodexLazyHooks,
  hasCodexLazyHooks,
} from './install.js';

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

function hasAllSkills(home) {
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
      skills: hasAllSkills(home),
    },
    copilot: { path: copilotPath, installed: existsSync(copilotPath) },
    codex: {
      path: codexPath,
      installed: existsSync(codexPath) && hasCodexLazyHooks(JSON.parse(readFileSync(codexPath, 'utf8'))),
    },
  };
}
