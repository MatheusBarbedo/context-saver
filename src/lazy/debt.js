import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
const MARKER = /(?:\/\/|#)\s*econ:\s*(.+)$/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

export function scanDebt(cwd = process.cwd()) {
  const findings = [];
  for (const file of walk(cwd)) {
    let lines;
    try {
      lines = readFileSync(file, 'utf8').split(/\r?\n/);
    } catch {
      continue;
    }
    lines.forEach((line, i) => {
      const match = line.match(MARKER);
      if (!match) return;
      const text = match[1].trim();
      const commaIndex = text.indexOf(',');
      const ceiling = commaIndex === -1 ? text : text.slice(0, commaIndex).trim();
      const trigger = commaIndex === -1 ? null : text.slice(commaIndex + 1).trim();
      findings.push({ file, line: i + 1, ceiling, trigger });
    });
  }
  return findings;
}

export function formatDebtReport(findings, cwd = process.cwd()) {
  if (findings.length === 0) return 'Nenhuma dívida econ: encontrada.';
  const noTrigger = findings.filter((f) => !f.trigger).length;
  const rows = findings.map((f) => {
    const rel = relative(cwd, f.file);
    const trigger = f.trigger ? f.trigger : '[sem gatilho]';
    return `${rel}:${f.line} — ${f.ceiling} — ${trigger}`;
  });
  rows.push(`${findings.length} marcador(es), ${noTrigger} sem gatilho.`);
  return rows.join('\n');
}
