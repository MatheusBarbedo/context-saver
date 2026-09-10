import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

export const ECON_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const ECON_JS = join(ECON_ROOT, 'econ.js');

export const STATE_DIR = join(homedir(), '.context-saver');
const STATE_FILE = join(STATE_DIR, 'state.json');

export function isEnabled() {
  try {
    if (!existsSync(STATE_FILE)) return true;
    return JSON.parse(readFileSync(STATE_FILE, 'utf8')).enabled !== false;
  } catch {
    return true;
  }
}

export function setEnabled(value) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify({ enabled: value }, null, 2), 'utf8');
}

export function purgeData(dir = STATE_DIR) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
