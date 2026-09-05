import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function teeFilePath(id) {
  return join(tmpdir(), `econ-${id}.log`);
}

export function teeSave(content) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const file = teeFilePath(id);
  writeFileSync(file, String(content ?? ''), 'utf8');
  return { id, file };
}

export function withRecovery(summary, hiddenCount, fullContent) {
  if (!hiddenCount || hiddenCount <= 0) return summary;
  const { id } = teeSave(fullContent);
  return `${summary}\n… +${hiddenCount} linhas ocultas — recupere com: econ show ${id} [--lines A-B] [--grep X]`;
}
