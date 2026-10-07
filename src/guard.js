import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const OPERATORS = new Set([';', '|', '&', '<', '>', '(', ')', '\n', '\r']);
const FIND_ACTIONS = new Set(['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls']);
const WATCH_ALIAS_TOOLS = new Set(['tsc', 'webpack', 'rollup', 'vite']);
const SERVE_TOOLS = new Set(['webpack', 'esbuild']);
const SCRIPT_RUNNERS = new Set(['npm', 'pnpm', 'yarn']);
const DEV_SERVER = /\b(?:ng\s+serve|webpack\s+serve|webpack-dev-server|next\s+dev|nuxt\s+dev|nodemon|vite(?!\s+build)(?=\s|$))/;
const SCRIPT_REF = /\b(?:npm\s+run(?:-script)?|pnpm(?:\s+run)?|yarn(?:\s+run)?)\s+([\w:.-]+)/g;

function tokens(command) {
  return String(command ?? '').trim().split(/\s+/).filter(Boolean);
}

export function isSimpleCommand(command) {
  const s = String(command ?? '');
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      continue;
    }
    if (c === '`' || (c === '$' && s[i + 1] === '(')) return false;
    if (quote === '"') {
      if (c === '"') quote = null;
      continue;
    }
    if (c === "'" || c === '"') quote = c;
    else if (OPERATORS.has(c)) return false;
  }
  return quote === null && s.trim() !== '';
}

export function hasFindAction(command) {
  const parts = tokens(command);
  return parts[0] === 'find' && parts.some((p) => FIND_ACTIONS.has(p));
}

function isWatchFlag(part) {
  const m = /^--watch(?:All)?(?:=(.*))?$/.exec(part);
  return m !== null && m[1] !== 'false';
}

function composeIsLongRunning(parts) {
  if (parts[0] !== 'docker' || !parts.includes('compose')) return false;
  const has = (...names) => names.some((n) => parts.includes(n));
  if (has('up') && !has('-d', '--detach', '--wait')) return true;
  if (has('logs') && has('-f', '--follow')) return true;
  if (has('stats') && !has('--no-stream')) return true;
  return has('watch', 'events', 'attach');
}

function readScripts(cwd) {
  try {
    const scripts = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).scripts;
    return scripts && typeof scripts === 'object' ? scripts : {};
  } catch {
    return {};
  }
}

function scriptIsLongRunning(text, scripts, depth) {
  const parts = tokens(text);
  if (parts.some(isWatchFlag) || parts.includes('-w')) return true;
  if (/\bng\s+test\b/.test(text) && !/--watch=false|--no-watch/.test(text)) return true;
  if (/\bkarma\s+start\b/.test(text) && !/--single-run(?!=false)/.test(text)) return true;
  if (DEV_SERVER.test(text)) return true;
  if (depth >= 3) return false;
  for (const [, name] of text.matchAll(SCRIPT_REF)) {
    if (typeof scripts[name] === 'string' && scriptIsLongRunning(scripts[name], scripts, depth + 1)) return true;
  }
  return false;
}

function npmScriptIsLongRunning(parts, cwd) {
  if (!SCRIPT_RUNNERS.has(parts[0])) return false;
  const i = parts[1] === 'run' || parts[1] === 'run-script' ? 2 : 1;
  const name = parts[i];
  if (!name || name.startsWith('-')) return false;
  if (/watch/i.test(name)) return true;
  const scripts = readScripts(cwd);
  if (typeof scripts[name] !== 'string') return false;
  return scriptIsLongRunning(`${scripts[name]} ${parts.slice(i + 1).join(' ')}`, scripts, 0);
}

export function isLongRunning(command, { cwd = process.cwd() } = {}) {
  const parts = tokens(command);
  if (parts.some(isWatchFlag)) return true;
  const tool = parts[0] === 'npx' ? parts[1] : parts[0];
  if (WATCH_ALIAS_TOOLS.has(tool) && parts.includes('-w')) return true;
  if (SERVE_TOOLS.has(tool) && parts.some((p) => p === 'serve' || p.startsWith('--serve'))) return true;
  if (composeIsLongRunning(parts)) return true;
  return npmScriptIsLongRunning(parts, cwd);
}
