import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const CMD = /(^|\s)(ls|dir|tree|Get-ChildItem|gci)\b/;

const listingFilter = {
  name: 'listing',
  test: (cmd) => CMD.test(cmd),
  run: ({ stdout }) => {
    const lines = splitLines(stdout);
    const LIMIT = 40;
    if (lines.length <= LIMIT) return null;
    const kept = [`${lines.length} itens (mostrando ${LIMIT}):`, ...lines.slice(0, LIMIT)];
    return withRecovery(kept.join('\n'), countHidden(lines, kept), stdout);
  },
};

export const listingFilters = [listingFilter];
