import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const CMD = /^\s*(?:npx\s+)?(?:tsc|eslint|ruff|flake8|clippy|cargo\s+clippy)\b/;
const PROBLEM = /(error|warning|erro|aviso|✖|problem|\bE\d{3}\b|\bTS\d+\b)/i;

const lintFilter = {
  name: 'lint',
  test: (cmd) => CMD.test(cmd),
  run: ({ stdout, stderr, exitCode }) => {
    const full = stdout + (stderr ? `\n${stderr}` : '');
    const lines = splitLines(full);
    if (exitCode === 0) {
      return withRecovery('lint/build: sem problemas ✔', lines.length, full);
    }
    const kept = lines.filter((l) => PROBLEM.test(l));
    if (kept.length === 0) return null;
    return withRecovery(kept.join('\n'), countHidden(lines, kept), full);
  },
};

export const lintFilters = [lintFilter];
