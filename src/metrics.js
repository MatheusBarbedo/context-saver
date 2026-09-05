import { homedir } from 'node:os';
import { join } from 'node:path';
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';

export const METRICS_FILE = join(homedir(), '.context-saver', 'metrics.jsonl');

export function record(entry, file = METRICS_FILE) {
  try {
    mkdirSync(join(file, '..'), { recursive: true });
    appendFileSync(file, JSON.stringify({ ts: Date.now(), ...entry }) + '\n', 'utf8');
  } catch {
    return;
  }
}

export function aggregate(file = METRICS_FILE) {
  const agg = {
    count: 0,
    totalBytesBefore: 0,
    totalBytesAfter: 0,
    totalTokensBefore: 0,
    totalTokensAfter: 0,
    byFamily: {},
  };
  if (!existsSync(file)) return agg;
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    agg.count++;
    agg.totalBytesBefore += e.bytesBefore || 0;
    agg.totalBytesAfter += e.bytesAfter || 0;
    agg.totalTokensBefore += e.tokensBefore || 0;
    agg.totalTokensAfter += e.tokensAfter || 0;
    const fam = e.family || 'none';
    const f =
      agg.byFamily[fam] ||
      (agg.byFamily[fam] = { count: 0, bytesBefore: 0, bytesAfter: 0, tokensBefore: 0, tokensAfter: 0 });
    f.count++;
    f.bytesBefore += e.bytesBefore || 0;
    f.bytesAfter += e.bytesAfter || 0;
    f.tokensBefore += e.tokensBefore || 0;
    f.tokensAfter += e.tokensAfter || 0;
  }
  return agg;
}
