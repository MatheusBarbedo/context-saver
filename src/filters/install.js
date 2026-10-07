import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const CMD = /^\s*(?:npm\s+(?:install|i|ci)|pnpm\s+(?:install|i|add)|yarn\s+(?:install|add)|pip3?\s+install)\b/;
const RESULT = /(added|removed|changed|audited|Successfully installed|packages in|up to date|funding|found\s+\d+\s+vulnerab|error|ERR!|failed)/i;

const installFilter = {
  name: 'install',
  test: (cmd) => CMD.test(cmd),
  run: ({ stdout, stderr }) => {
    const full = stdout + (stderr ? `\n${stderr}` : '');
    const lines = splitLines(full);
    if (lines.length === 0) return null;
    const kept = lines.filter((l) => RESULT.test(l));
    if (kept.length === 0) return null;
    return withRecovery(kept.join('\n'), countHidden(lines, kept), full);
  },
};

export const installFilters = [installFilter];
