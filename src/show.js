import { existsSync, readFileSync } from 'node:fs';
import { teeFilePath } from './tee.js';

export function readRecovery(id, { lines, grep } = {}) {
  const file = teeFilePath(id);
  if (!existsSync(file)) throw new Error(`recuperação não encontrada: ${id}`);
  let out = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  if (out.length && out[out.length - 1] === '') out.pop();
  if (lines) {
    const [a, b] = lines.split('-').map((n) => parseInt(n, 10));
    const start = Math.max(1, a) - 1;
    const end = Number.isFinite(b) ? b : a;
    out = out.slice(start, end);
  }
  if (grep) {
    const re = new RegExp(grep);
    out = out.filter((l) => re.test(l));
  }
  return out.join('\n');
}
