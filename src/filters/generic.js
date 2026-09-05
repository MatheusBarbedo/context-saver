import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const HEAD = 40;
const TAIL = 40;
const LIMIT = HEAD + TAIL;

const genericFilter = {
  name: 'generic',
  test: () => true,
  run: ({ stdout, stderr }) => {
    const full = stdout + (stderr ? `\n${stderr}` : '');
    const lines = splitLines(full);
    if (lines.length <= LIMIT) return null;
    const kept = [...lines.slice(0, HEAD), '…', ...lines.slice(-TAIL)];
    return withRecovery(kept.join('\n'), countHidden(lines, kept), full);
  },
};

export const genericFilters = [genericFilter];
