import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { STATE_DIR } from '../state.js';

export const VALID_MODES = ['off', 'lite', 'full', 'ultra'];

function statePath(agent) {
  return join(STATE_DIR, `lazy-state-${agent}.json`);
}

export function readLazyState(agent) {
  try {
    return JSON.parse(readFileSync(statePath(agent), 'utf8'));
  } catch {
    return { mode: null, defaultMode: 'full' };
  }
}

export function writeLazyState(agent, state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(statePath(agent), JSON.stringify(state, null, 2), 'utf8');
}

export function resolveDefaultMode(agent) {
  const env = (process.env.ECON_LAZY_MODE || '').toLowerCase();
  if (VALID_MODES.includes(env) && env !== 'off') return env;
  const { defaultMode } = readLazyState(agent);
  if (VALID_MODES.includes(defaultMode)) return defaultMode;
  return 'full';
}

export function setSessionMode(agent, mode) {
  writeLazyState(agent, { ...readLazyState(agent), mode });
}

export function clearSessionMode(agent) {
  writeLazyState(agent, { ...readLazyState(agent), mode: null });
}

export function readSessionMode(agent) {
  return readLazyState(agent).mode;
}

export function setDefaultMode(agent, mode) {
  writeLazyState(agent, { ...readLazyState(agent), defaultMode: mode });
}

export { statePath };
