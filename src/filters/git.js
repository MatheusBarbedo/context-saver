import { splitLines, stripLines, collapseBlankRuns, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const HINT = /^\s*\(use /;

const gitStatus = {
  name: 'git-status',
  test: (cmd) => /^\s*git\s+status\b/.test(cmd),
  run: ({ stdout }) => {
    const original = splitLines(stdout);
    if (original.length === 0) return null;
    const kept = collapseBlankRuns(stripLines(original, HINT));
    return kept.join('\n');
  },
};

const gitLog = {
  name: 'git-log',
  test: (cmd) => /^\s*git\s+log\b/.test(cmd),
  run: ({ stdout }) => {
    const lines = splitLines(stdout);
    const LIMIT = 20;
    if (lines.length <= LIMIT) return null;
    const kept = lines.slice(0, LIMIT);
    const hidden = countHidden(lines, kept);
    return withRecovery(kept.join('\n'), hidden, stdout);
  },
};

const gitDiff = {
  name: 'git-diff',
  test: (cmd) => /^\s*git\s+diff\b/.test(cmd),
  run: ({ stdout }) => {
    const lines = splitLines(stdout);
    const LIMIT = 60;
    if (lines.length <= LIMIT) return null;
    let added = 0;
    let removed = 0;
    const files = [];
    for (const l of lines) {
      if (l.startsWith('diff --git')) files.push(l.replace('diff --git ', ''));
      else if (l.startsWith('+') && !l.startsWith('+++')) added++;
      else if (l.startsWith('-') && !l.startsWith('---')) removed++;
    }
    const summary = [
      `git diff: ${files.length} arquivo(s), +${added} -${removed}`,
      ...files.map((f) => `  ${f}`),
    ].join('\n');
    return withRecovery(summary, countHidden(lines, [summary]), stdout);
  },
};

export const gitFilters = [gitStatus, gitLog, gitDiff];
