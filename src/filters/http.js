import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const CMD = /(^|\s)(curl|wget|http|https)\b/;
const KEEP = /(^[<>]\s|HTTP\/\d|^\s*[A-Za-z-]+:\s|error|failed|\b[45]\d\d\b)/;

const httpFilter = {
  name: 'http',
  test: (cmd) => CMD.test(cmd),
  run: ({ stdout, stderr }) => {
    const full = stdout + (stderr ? `\n${stderr}` : '');
    const lines = splitLines(full);
    if (lines.length <= 40) return null;
    const kept = lines.filter((l) => KEEP.test(l));
    if (kept.length === 0) return null;
    return withRecovery(kept.join('\n'), countHidden(lines, kept), full);
  },
};

export const httpFilters = [httpFilter];
