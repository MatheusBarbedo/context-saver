import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const CMD = /(^|\s)(npm\s+(run\s+)?test|pnpm\s+(run\s+)?test|yarn\s+test|npx\s+jest|jest|pytest|py\.test|go\s+test|cargo\s+test)\b/;
const SUMMARY = /(passed|failed|passing|failing|Tests:|Ran\s+\d+|ok\b|FAILED|error|\d+\s+(passed|failed))/i;
const FAILURE = /(FAIL|FAILED|✕|✗|Error|assert|Expected|Received|panic|--- FAIL)/i;

const testsFilter = {
  name: 'tests',
  test: (cmd) => CMD.test(cmd),
  run: ({ stdout, stderr, exitCode }) => {
    const full = stdout + (stderr ? `\n${stderr}` : '');
    const lines = splitLines(full);
    if (lines.length === 0) return null;

    if (exitCode === 0) {
      const summary = lines.filter((l) => SUMMARY.test(l));
      const kept = summary.length ? summary : lines.slice(-3);
      return withRecovery(kept.join('\n'), countHidden(lines, kept), full);
    }
    const kept = lines.filter((l) => FAILURE.test(l) || SUMMARY.test(l));
    if (kept.length === 0) return null;
    return withRecovery(kept.join('\n'), countHidden(lines, kept), full);
  },
};

export const testFilters = [testsFilter];
