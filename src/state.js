import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

export const ECON_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const ECON_JS = join(ECON_ROOT, 'econ.js');

export function stateDir() {
  return process.env.ECON_HOME || join(homedir(), '.context-saver');
}

function stateFile() {
  return join(stateDir(), 'state.json');
}

export function isEnabled() {
  try {
    if (!existsSync(stateFile())) return true;
    return JSON.parse(readFileSync(stateFile(), 'utf8')).enabled !== false;
  } catch {
    return true;
  }
}

export function setEnabled(value) {
  mkdirSync(stateDir(), { recursive: true });
  writeFileSync(stateFile(), JSON.stringify({ enabled: value }, null, 2), 'utf8');
}

export function purgeData(dir = stateDir()) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
