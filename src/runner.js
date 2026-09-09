import { spawnSync } from 'node:child_process';
import { findFilter } from './filters/index.js';
import { genericFilters } from './filters/generic.js';
import { estimateTokens } from './tokens.js';
import { record, METRICS_FILE } from './metrics.js';

const genericFilter = genericFilters[0];

export function shellCandidates(shellHint, env = process.env) {
  const list = [];
  if (env.ECON_SHELL) list.push(env.ECON_SHELL);
  if (shellHint === 'bash') {
    list.push(
      'bash',
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    );
  } else if (shellHint === 'powershell') {
    list.push('powershell');
  }
  return list;
}

function defaultExec(command, shellHint) {
  const base = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  for (const sh of shellCandidates(shellHint)) {
    const r = spawnSync(command, { ...base, shell: sh });
    if (!(r.error && r.error.code === 'ENOENT')) return r;
  }
  return spawnSync(command, { ...base, shell: true });
}

export function runAndCompress(command, { shell, agent, exec = defaultExec, metricsFile = METRICS_FILE } = {}) {
  const res = exec(command, shell) || {};
  const rawStdout = res.stdout ?? '';
  const rawStderr = res.stderr ?? '';
  const exitCode = typeof res.status === 'number' ? res.status : 1;

  const filter = findFilter(command);
  let compressed = null;
  let familyName = filter ? filter.name : 'none';
  if (filter) {
    try {
      compressed = filter.run({ command, stdout: rawStdout, stderr: rawStderr, exitCode });
    } catch {
      compressed = null;
    }
  }
  if (compressed == null) {
    try {
      compressed = genericFilter.run({ command, stdout: rawStdout, stderr: rawStderr, exitCode });
    } catch {
      compressed = null;
    }
    if (compressed != null) familyName = 'generic';
  }

  const rawFull = rawStdout + rawStderr;
  const filtered = compressed != null;
  const outText = filtered ? compressed : rawFull;
  record(
    {
      family: familyName,
      agent: agent || 'unknown',
      bytesBefore: Buffer.byteLength(rawFull, 'utf8'),
      bytesAfter: Buffer.byteLength(outText, 'utf8'),
      tokensBefore: estimateTokens(rawFull),
      tokensAfter: estimateTokens(outText),
      filtered,
      exitCode,
    },
    metricsFile,
  );

  if (filtered) return { stdout: compressed, stderr: '', exitCode, filtered: true };
  return { stdout: rawStdout, stderr: rawStderr, exitCode, filtered: false };
}
