import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const CMD = /^\s*docker\s+(?:build|ps|images|compose)\b/;
const KEEP = /(Successfully|error|ERROR|failed|CONTAINER ID|IMAGE ID|--->|Step\s+\d+|naming to|writing image)/i;

const dockerFilter = {
  name: 'docker',
  test: (cmd) => CMD.test(cmd),
  run: ({ stdout, stderr }) => {
    const full = stdout + (stderr ? `\n${stderr}` : '');
    const lines = splitLines(full);
    if (lines.length <= 20) return null;
    const kept = lines.filter((l) => KEEP.test(l));
    if (kept.length === 0) return null;
    return withRecovery(kept.join('\n'), countHidden(lines, kept), full);
  },
};

export const dockerFilters = [dockerFilter];
