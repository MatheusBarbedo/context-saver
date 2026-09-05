import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const CMD = /(^|\s)(grep|egrep|rg|ag|find)\b/;
const SAMPLE = 30;

const searchFilter = {
  name: 'search',
  test: (cmd) => CMD.test(cmd),
  run: ({ stdout }) => {
    const lines = splitLines(stdout);
    if (lines.length <= SAMPLE) return null;
    const kept = [`${lines.length} resultados (amostra de ${SAMPLE}):`, ...lines.slice(0, SAMPLE)];
    return withRecovery(kept.join('\n'), countHidden(lines, kept), stdout);
  },
};

export const searchFilters = [searchFilter];
