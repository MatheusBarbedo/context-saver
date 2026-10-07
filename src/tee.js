import { mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './state.js';

export const TEE_TTL_MS = 24 * 60 * 60 * 1000;
const ID_PATTERN = /^[A-Za-z0-9-]+$/;

export function teeDir() {
  return join(stateDir(), 'tee');
}

export function teeFilePath(id) {
  if (!ID_PATTERN.test(String(id))) throw new Error(`id de recuperação inválido: ${id}`);
  return join(teeDir(), `${id}.log`);
}

export function pruneTee(now = Date.now()) {
  let names;
  try {
    names = readdirSync(teeDir());
  } catch {
    return;
  }
  for (const name of names) {
    const file = join(teeDir(), name);
    try {
      if (now - statSync(file).mtimeMs > TEE_TTL_MS) rmSync(file, { force: true });
    } catch {
      continue;
    }
  }
}

export function teeSave(content) {
  mkdirSync(teeDir(), { recursive: true, mode: 0o700 });
  pruneTee();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const file = teeFilePath(id);
  writeFileSync(file, String(content ?? ''), { encoding: 'utf8', mode: 0o600 });
  return { id, file };
}

export function withRecovery(summary, hiddenCount, fullContent) {
  if (!hiddenCount || hiddenCount <= 0) return summary;
  const { file } = teeSave(fullContent);
  return `${summary}\n… +${hiddenCount} linhas ocultas. Saída completa: ${file} (leia só o trecho necessário)`;
}
